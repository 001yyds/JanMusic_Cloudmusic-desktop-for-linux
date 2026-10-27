package com.janmusic.player;

import android.app.Dialog;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 用系统 WebView 打开网易云官方登录页。
 * 短信登录遇到的风控滑块由用户在网页里自己完成，插件只负责在登录成功后
 * 把 CookieManager 里的 MUSIC_U 等凭据回传给 JS 层。
 */
@CapacitorPlugin(name = "WebLogin")
public class WebLoginPlugin extends Plugin {

    private static final String LOGIN_URL = "https://music.163.com/#/login";
    private static final String COOKIE_URL = "https://music.163.com";
    private static final String UA =
            "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) "
                    + "Chrome/131.0.0.0 Mobile Safari/537.36";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Dialog dialog;
    private WebView webView;
    private PluginCall pending;
    /** 打开登录页瞬间的 Cookie 快照，用来判断 MUSIC_U 是不是本次新产生的 */
    private String preLoginCookie = "";

    /** 只允许停留在网易云自己的 https 域名，防止登录页把导航带到钓鱼站点 */
    private static boolean isAllowedUrl(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme())) return false;
        String host = uri.getHost();
        if (host == null) return false;
        return host.equals("music.163.com") || host.endsWith(".music.163.com");
    }

    private static String cookieValue(String jar, String name) {
        if (jar == null) return null;
        for (String piece : jar.split(";")) {
            String pair = piece.trim();
            int eq = pair.indexOf('=');
            if (eq <= 0) continue;
            if (pair.substring(0, eq).trim().equals(name)) return pair.substring(eq + 1).trim();
        }
        return null;
    }

    /** 只有当 MUSIC_U 是打开登录页之后新产生的时候，才算登录成功 */
    private boolean hasFreshMusicU(String cookie) {
        String current = cookieValue(cookie, "MUSIC_U");
        if (current == null || current.isEmpty()) return false;
        return !current.equals(cookieValue(preLoginCookie, "MUSIC_U"));
    }

    private final Runnable poll = new Runnable() {
        @Override
        public void run() {
            if (pending == null) return;
            String cookie = CookieManager.getInstance().getCookie(COOKIE_URL);
            if (hasFreshMusicU(cookie)) {
                finish(cookie);
                return;
            }
            handler.postDelayed(this, 800);
        }
    };

    @PluginMethod
    public void open(PluginCall call) {
        if (pending != null) {
            call.reject("登录窗口已打开");
            return;
        }
        pending = call;
        getActivity().runOnUiThread(() -> {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);

            webView = new WebView(getActivity());
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setUserAgentString(UA);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    // 只放行主框架内的网易云域名，其余导航一律拦下
                    if (!request.isForMainFrame()) return false;
                    return !isAllowedUrl(request.getUrl().toString());
                }
            });

            preLoginCookie = cookieManager.getCookie(COOKIE_URL);

            dialog = new Dialog(getActivity(), android.R.style.Theme_Material_Light_NoActionBar);
            dialog.setContentView(
                    webView,
                    new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));
            dialog.setCanceledOnTouchOutside(false);
            Window window = dialog.getWindow();
            if (window != null) {
                window.setLayout(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            }
            dialog.setOnDismissListener(ignored -> finish(null));
            dialog.show();

            // 带 Domain 的 Cookie 用逐条 Max-Age=0 删不干净，直接清空整个 WebView Cookie 存储，
            // 清完再复核一次，确认没有残留的 MUSIC_U 才继续加载登录页。
            cookieManager.removeAllCookies(removed -> {
                cookieManager.flush();
                if (cookieValue(cookieManager.getCookie(COOKIE_URL), "MUSIC_U") != null) {
                    finishWithError("无法清除上一次的登录状态，请重试");
                    return;
                }
                if (webView == null) return;
                webView.loadUrl(LOGIN_URL);
                handler.postDelayed(poll, 800);
            });
        });
    }

    /** 退出登录时同步清空 WebView 的 Cookie 存储 */
    @PluginMethod
    public void clear(PluginCall call) {
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.removeAllCookies(removed -> {
            cookieManager.flush();
            call.resolve();
        });
    }

    private void close() {
        handler.removeCallbacks(poll);
        if (dialog != null) {
            dialog.setOnDismissListener(null);
            dialog.dismiss();
            dialog = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
    }

    private void finish(String cookie) {
        PluginCall call = pending;
        pending = null;
        close();
        if (call == null) return;

        if (cookie == null) {
            call.reject("已取消登录");
            return;
        }
        CookieManager.getInstance().flush();
        JSObject result = new JSObject();
        result.put("cookie", cookie);
        call.resolve(result);
    }

    private void finishWithError(String message) {
        PluginCall call = pending;
        pending = null;
        close();
        if (call != null) call.reject(message);
    }
}

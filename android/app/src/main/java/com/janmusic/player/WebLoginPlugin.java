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

    /** 只允许停留在网易云自己的 https 域名，防止登录页把导航带到钓鱼站点 */
    private static boolean isAllowedUrl(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme())) return false;
        String host = uri.getHost();
        if (host == null) return false;
        return host.equals("music.163.com") || host.endsWith(".music.163.com");
    }

    /**
     * 打开登录页前清掉上一次留下的 music.163.com Cookie，
     * 否则轮询会立刻读到旧的 MUSIC_U，用户以为登录成功、实际还是旧会话。
     */
    private static void clearMusicCookies(CookieManager cookieManager) {
        String existing = cookieManager.getCookie(COOKIE_URL);
        if (existing != null) {
            for (String pair : existing.split(";")) {
                int eq = pair.indexOf('=');
                String name = (eq > 0 ? pair.substring(0, eq) : pair).trim();
                if (name.isEmpty()) continue;
                cookieManager.setCookie(COOKIE_URL, name + "=; Max-Age=0; Path=/");
            }
        }
        cookieManager.flush();
    }

    private final Runnable poll = new Runnable() {
        @Override
        public void run() {
            if (pending == null) return;
            String cookie = CookieManager.getInstance().getCookie(COOKIE_URL);
            if (cookie != null && cookie.contains("MUSIC_U=")) {
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

            clearMusicCookies(cookieManager);
            webView.loadUrl(LOGIN_URL);

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
            handler.postDelayed(poll, 800);
        });
    }

    private void finish(String cookie) {
        PluginCall call = pending;
        pending = null;
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
}

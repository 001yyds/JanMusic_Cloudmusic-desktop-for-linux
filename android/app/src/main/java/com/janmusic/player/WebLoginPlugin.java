package com.janmusic.player;

import android.app.Dialog;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
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
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            webView.setWebViewClient(new WebViewClient());
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

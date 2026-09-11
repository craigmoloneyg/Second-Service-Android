package com.secondservice.android;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;

public final class MainActivity extends Activity {
    private static final int PICK_FILE = 100;
    private WebView web;
    private ProgressBar progress;
    private LinearLayout errorPanel;
    private ValueCallback<Uri[]> fileCallback;
    private String lastPage = NavigationPolicy.HOME;
    private boolean pageFailed;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(7, 17, 30));
        if (android.os.Build.VERSION.SDK_INT >= 30) root.setOnApplyWindowInsetsListener((view, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        });
        // API 29 predates the typed insets API.
        if (android.os.Build.VERSION.SDK_INT == 29) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
                return insets.consumeSystemWindowInsets();
            });
        }
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(-1, 6));
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setPadding(32, 48, 32, 32);
        TextView message = new TextView(this);
        message.setText("Second Service couldn't load this page. Check your connection and try again.");
        message.setTextColor(Color.WHITE);
        errorPanel.addView(message);
        Button retry = new Button(this);
        retry.setText("Try again");
        retry.setOnClickListener(v -> web.loadUrl(lastPage));
        errorPanel.addView(retry);
        errorPanel.setVisibility(View.GONE);
        root.addView(errorPanel);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(7, 17, 30));
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (NavigationPolicy.isInternal(url)) return false;
                if (request.isForMainFrame()) openExternal(request.getUrl());
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                pageFailed = false;
                if (NavigationPolicy.isInternal(url)) lastPage = url;
                errorPanel.setVisibility(View.GONE);
                web.setVisibility(View.VISIBLE);
                progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                if (pageFailed) showError();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent picker = params.createIntent();
                    picker.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(picker, PICK_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    toast("No file picker is available on this device.");
                }
                return true;
            }
        });
        web.setDownloadListener((url, userAgent, disposition, mime, length) -> {
            if (!NavigationPolicy.isInternal(url)) {
                openExternal(Uri.parse(url));
                return;
            }
            try {
                String filename = URLUtil.guessFileName(url, disposition, mime).replaceAll("[\\\\/\\r\\n]", "_");
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mime);
                request.addRequestHeader("User-Agent", userAgent);
                String cookies = CookieManager.getInstance().getCookie(url);
                if (cookies != null) request.addRequestHeader("Cookie", cookies);
                request.setTitle(filename);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                getSystemService(DownloadManager.class).enqueue(request);
                toast("Download started. Check Downloads.");
            } catch (RuntimeException e) { toast("Unable to start download. Please try again."); }
        });
        if (savedState != null) lastPage = savedState.getString("lastPage", NavigationPolicy.HOME);
        if (savedState == null || web.restoreState(savedState) == null) web.loadUrl(lastPage);
    }

    private void showError() {
        pageFailed = true;
        progress.setVisibility(View.GONE);
        web.setVisibility(View.GONE);
        errorPanel.setVisibility(View.VISIBLE);
    }
    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (!("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)
            || "mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme))) {
            toast("This link type is not supported.");
            return;
        }
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException e) { toast("No app is available to open this link."); }
    }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_FILE && fileCallback != null) {
            Uri[] picked = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            ArrayList<Uri> safe = new ArrayList<>();
            if (picked != null) for (Uri uri : picked) {
                if ("content".equals(uri.getScheme()) && !getPackageName().equals(uri.getAuthority())) safe.add(uri);
            }
            fileCallback.onReceiveValue(safe.isEmpty() ? null : safe.toArray(new Uri[0]));
            fileCallback = null;
        }
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        web.saveState(state);
        state.putString("lastPage", lastPage);
        super.onSaveInstanceState(state);
    }
    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onPause() {
        web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        ((android.view.ViewGroup) web.getParent()).removeView(web);
        web.destroy();
        super.onDestroy();
    }
}

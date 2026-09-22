package com.secondservice.android;
import java.net.URI;
import java.util.Set;
final class NavigationPolicy {
    static final String HOME="https://garnish-craig.craig-moloneyg.chatgpt.site/";
    private static final String APP_HOST="garnish-craig.craig-moloneyg.chatgpt.site";
    private static final Set<String> AUTH_HOSTS=new java.util.HashSet<>(java.util.Arrays.asList("chatgpt.com","auth.openai.com","auth0.openai.com","accounts.google.com","appleid.apple.com","login.live.com","login.microsoftonline.com"));
    private static URI safe(String url) {
        try { URI u=URI.create(url);return "https".equalsIgnoreCase(u.getScheme()) && u.getHost()!=null && u.getUserInfo()==null && (u.getPort()==-1||u.getPort()==443)?u:null; }
        catch(IllegalArgumentException e){return null;}
    }
    static boolean isApp(String url){URI u=safe(url);return u!=null && APP_HOST.equalsIgnoreCase(u.getHost());}
    static boolean isInternal(String url){URI u=safe(url);return u!=null && (APP_HOST.equalsIgnoreCase(u.getHost())||AUTH_HOSTS.contains(u.getHost().toLowerCase(java.util.Locale.ROOT)));}
}

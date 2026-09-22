package com.secondservice.android;
import org.junit.Test;
import static org.junit.Assert.*;
public class NavigationPolicyTest {
 @Test public void appAndCallbackRemainInApp() { assertTrue(NavigationPolicy.isApp(NavigationPolicy.HOME+"workspace")); assertTrue(NavigationPolicy.isInternal(NavigationPolicy.HOME+"callback?code=test")); }
 @Test public void signInRemainsInApp() {assertTrue(NavigationPolicy.isInternal("https://auth.openai.com/authorize"));assertTrue(NavigationPolicy.isInternal("https://chatgpt.com/auth/login"));assertTrue(NavigationPolicy.isInternal("https://accounts.google.com/o/oauth2/auth"));assertFalse(NavigationPolicy.isApp("https://auth.openai.com/authorize"));}
 @Test public void rejectsUnsafeDestinations(){for(String url:new String[]{"http://auth.openai.com","https://auth.openai.com.evil.example","https://auth.openai.com@evil.example","https://auth.openai.com:8443","file:///etc/passwd","javascript:alert(1)"})assertFalse(url,NavigationPolicy.isInternal(url));}
}

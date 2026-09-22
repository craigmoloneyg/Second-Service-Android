package com.secondservice.android;

import org.junit.Test;
import static org.junit.Assert.*;

public class NavigationPolicyTest {
    @Test public void acceptsAppPaths() {
        assertTrue(NavigationPolicy.isInternal(NavigationPolicy.HOME));
        assertTrue(NavigationPolicy.isInternal(NavigationPolicy.HOME + "admin?venue=2#invoice-processing"));
    }
    @Test public void rejectsLookalikesAndUnsafeSchemes() {
        assertFalse(NavigationPolicy.isInternal("http://garnish-craig.craig-moloneyg.chatgpt.site/"));
        assertFalse(NavigationPolicy.isInternal("https://garnish-craig.craig-moloneyg.chatgpt.site.evil.example/"));
        assertFalse(NavigationPolicy.isInternal("https://garnish-craig.craig-moloneyg.chatgpt.site@evil.example/"));
        assertFalse(NavigationPolicy.isInternal("file:///etc/passwd"));
        assertFalse(NavigationPolicy.isInternal("javascript:alert(1)"));
        assertFalse(NavigationPolicy.isInternal("https://garnish-craig.craig-moloneyg.chatgpt.site:8443/"));
    }
}

package com.secondservice.android;

import org.junit.Test;
import static org.junit.Assert.*;

public class NavigationPolicyTest {
    @Test public void acceptsAppPaths() {
        assertTrue(NavigationPolicy.isInternal(NavigationPolicy.HOME));
        assertTrue(NavigationPolicy.isInternal(NavigationPolicy.HOME + "admin?venue=2#invoice-processing"));
    }
    @Test public void rejectsLookalikesAndUnsafeSchemes() {
        assertFalse(NavigationPolicy.isInternal("http://second-service-profit-intelligence.craig-moloneyg.workers.dev/"));
        assertFalse(NavigationPolicy.isInternal("https://second-service-profit-intelligence.craig-moloneyg.workers.dev.evil.example/"));
        assertFalse(NavigationPolicy.isInternal("https://second-service-profit-intelligence.craig-moloneyg.workers.dev@evil.example/"));
        assertFalse(NavigationPolicy.isInternal("file:///etc/passwd"));
        assertFalse(NavigationPolicy.isInternal("javascript:alert(1)"));
        assertFalse(NavigationPolicy.isInternal("https://second-service-profit-intelligence.craig-moloneyg.workers.dev:8443/"));
    }
}

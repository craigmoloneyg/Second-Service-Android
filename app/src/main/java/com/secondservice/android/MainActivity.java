package com.secondservice.android;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Opens the hosted workspace in the user's browser, preserving its sign-in session. */
public final class MainActivity extends Activity {
    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 64, 32, 32);
        TextView message = new TextView(this);
        message.setText("Garnish Live opens your workspace in your browser. Internet access is required.");
        message.setTextSize(18);
        root.addView(message);
        Button open = new Button(this);
        open.setText("Open Garnish");
        root.addView(open);
        open.setOnClickListener(v -> openWorkspace(message));
        setContentView(root);
        openWorkspace(message);
    }
    private void openWorkspace(TextView message) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(NavigationPolicy.HOME + "workspace"));
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
            finish();
        } catch (ActivityNotFoundException error) {
            message.setText("A web browser is needed to open Garnish. Install or enable a browser, then tap Open Garnish.");
        }
    }
}

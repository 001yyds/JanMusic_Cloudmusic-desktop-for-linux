package com.betterncm.player;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WebLoginPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

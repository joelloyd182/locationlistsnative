const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withForegroundServicePermission(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Add FOREGROUND_SERVICE permission
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const foregroundServicePermission = {
      $: {
        'android:name': 'android.permission.FOREGROUND_SERVICE',
      },
    };

    const foregroundServiceLocationPermission = {
      $: {
        'android:name': 'android.permission.FOREGROUND_SERVICE_LOCATION',
      },
    };

    // Check if permissions already exist
    const hasPermission = androidManifest['uses-permission'].some(
      (perm) => perm.$['android:name'] === 'android.permission.FOREGROUND_SERVICE'
    );

    const hasLocationPermission = androidManifest['uses-permission'].some(
      (perm) => perm.$['android:name'] === 'android.permission.FOREGROUND_SERVICE_LOCATION'
    );

    if (!hasPermission) {
      androidManifest['uses-permission'].push(foregroundServicePermission);
    }

    if (!hasLocationPermission) {
      androidManifest['uses-permission'].push(foregroundServiceLocationPermission);
    }

    return config;
  });
};
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const structure = {
  'src': {
    'api': {
      'client.ts': '',
      'endpoints': {
        'auth.ts': '',
        'user.ts': '',
        'cattle.ts': '',
        'admin.ts': '',
      }
    },
    'components': {
      'common': {
        'Button.tsx': '',
        'Input.tsx': '',
        'LoadingSpinner.tsx': '',
        'Card.tsx': '',
        'Avatar.tsx': '',
        'Badge.tsx': '',
        'Toast.tsx': '',
      },
      'auth': {
        'LoginForm.tsx': '',
        'SignupForm.tsx': '',
        'OTPInput.tsx': '',
      },
      'cattle': {
        'CattleCard.tsx': '',
        'CattleDetails.tsx': '',
        'CattleImageUploader.tsx': '',
        'CattleForm.tsx': '',
      },
      'admin': {
        'UserList.tsx': '',
        'CattleApproval.tsx': '',
        'StatsCard.tsx': '',
      }
    },
    'screens': {
      'auth': {
        'SplashScreen.tsx': '',
        'OnboardingScreen.tsx': '',
        'LoginScreen.tsx': '',
        'SignupScreen.tsx': '',
        'ForgotPasswordScreen.tsx': '',
      },
      'user': {
        'HomeScreen.tsx': '',
        'CattleGalleryScreen.tsx': '',
        'AddCattleScreen.tsx': '',
        'CattleDetailsScreen.tsx': '',
        'ProfileScreen.tsx': '',
        'SettingsScreen.tsx': '',
      },
      'admin': {
        'AdminDashboardScreen.tsx': '',
        'UserManagementScreen.tsx': '',
        'CattleVerificationScreen.tsx': '',
        'ReportsScreen.tsx': '',
      }
    },
    'navigation': {
      'types.ts': '',
      'AppNavigator.tsx': '',
      'AuthNavigator.tsx': '',
      'UserNavigator.tsx': '',
      'AdminNavigator.tsx': '',
    },
    'store': {
      'slices': {
        'authSlice.ts': '',
        'userSlice.ts': '',
        'cattleSlice.ts': '',
      },
      'index.ts': '',
    },
    'hooks': {
      'useAuth.ts': '',
      'useImagePicker.ts': '',
      'useLocation.ts': '',
      'useToast.ts': '',
    },
    'utils': {
      'storage.ts': '',
      'validation.ts': '',
      'imageProcessor.ts': '',
      'constants.ts': '',
    },
    'types': {
      'auth.types.ts': '',
      'user.types.ts': '',
      'cattle.types.ts': '',
      'admin.types.ts': '',
    },
    'assets': {
      'images': {},
      'fonts': {},
      'icons': {},
    },
    'config': {
      'env.ts': '',
      'theme.ts': '',
    }
  }
};

function createStructure(base, struct) {
  Object.keys(struct).forEach(key => {
    const fullPath = path.join(base, key);
    
    if (typeof struct[key] === 'object' && struct[key] !== null && !Array.isArray(struct[key])) {
      // It's a directory
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${fullPath}`);
      }
      createStructure(fullPath, struct[key]);
    } else {
      // It's a file
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, struct[key]);
        console.log(`📄 Created file: ${fullPath}`);
      }
    }
  });
}

console.log('🚀 Generating project structure...\n');
createStructure(process.cwd(), structure);
console.log('\n✅ Project structure created successfully!');
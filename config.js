// הגדרות ציבוריות (לא סודות): כתובת השרת, כתובת האפליקציה, והגדרות Firebase לקבלת התראות.
// ההרשאה לשלוח התראות נמצאת רק בשרת של Google, לא כאן.
self.APP_CONFIG = {
  serverUrl: 'https://script.google.com/macros/s/AKfycbwb99Wh9mqsHnkqg9RbzncyL2-A-YBO5aWI06Pe8MJW7NfBKdl9RtqkB_Aw48tbXiMbuA/exec',
  appUrl: 'https://david30102-ux.github.io/team-tasks/',
  firebase: {
    apiKey: 'AIzaSyDmMfhwGwTMKeHO3Hio4b5UTvzR1bUlMk4',
    authDomain: 'team-tasks-6069.firebaseapp.com',
    projectId: 'team-tasks-6069',
    messagingSenderId: '929961288786',
    appId: '1:929961288786:web:3ca15692b9b4cc5421ab8b'
  },
  vapidKey: '' // ריק = המפתח המובנה של Firebase (כמו בבדיקה שעבדה בשלב 0)
};

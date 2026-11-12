// הגדרות ציבוריות (לא סודות): כתובת השרת והגדרות Firebase לקבלת התראות.
// הגישה לשרת מוגנת בקוד הבדיקה; ההרשאה לשלוח התראות נמצאת רק ב-Google.
self.PROBE_CONFIG = {
  serverUrl: 'https://script.google.com/macros/s/AKfycbwb99Wh9mqsHnkqg9RbzncyL2-A-YBO5aWI06Pe8MJW7NfBKdl9RtqkB_Aw48tbXiMbuA/exec',
  firebase: {
    apiKey: 'AIzaSyDmMfhwGwTMKeHO3Hio4b5UTvzR1bUlMk4',
    authDomain: 'team-tasks-6069.firebaseapp.com',
    projectId: 'team-tasks-6069',
    messagingSenderId: '929961288786',
    appId: '1:929961288786:web:3ca15692b9b4cc5421ab8b'
  },
  vapidKey: '' // ריק = המפתח המובנה של Firebase
};

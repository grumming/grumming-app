<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAl-C6_m_jeHiBxmX4rUgCzN14eftpTBeI",
    authDomain: "grumming-552d2.firebaseapp.com",
    projectId: "grumming-552d2",
    storageBucket: "grumming-552d2.firebasestorage.app",
    messagingSenderId: "901278748260",
    appId: "1:901278748260:web:7a1968f59c9aa08680d971",
    measurementId: "G-NTH8DNDRV5"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
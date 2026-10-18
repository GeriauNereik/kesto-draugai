// Firebase projektas (tėvų admin panelei). Šios reikšmės nėra slaptos – prieigą riboja firestore.rules.
// apiKey === '' → sinchronizacija išjungta (žaidimas veikia kaip anksčiau, tik šiame įrenginyje).
export const FIREBASE = {
  apiKey: 'AIzaSyDAZXhTAoAVXyAcVDAoOlvilziobacz6_s',
  authDomain: 'miskiniai-616db.firebaseapp.com',
  projectId: 'miskiniai-616db',
  appId: '1:735720218098:web:d4478a1f955cc136e1df6b',
};

/** Admin paskyros el. paštas (tik ji mato statistiką ir gali užrakinti). Turi sutapti su firestore.rules. */
export const ADMIN_EMAIL = 'tomas@bucel.lt';

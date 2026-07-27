# Audit final AxioGraph Lab

**Data evaluării:** 27 iulie 2026  
**Versiune evaluată:** commit `3405936`  
**Verdict scurt:** beta funcțională / prototip avansat, nu încă versiune de producție.

## 1. Domeniu și metodă

Auditul acoperă codul client, structura proiectului, istoricul Git disponibil, documentația și verificări statice reproductibile. Nu există în repository un document intitulat „auditul vechi”, așa că progresul a fost comparat cu reperul tehnic `d57086c`, commitul în care apare prima structură modulară apropiată de cea actuală. Concluziile despre comportamentul pe telefon se bazează pe jurnalul de testare existent; în această evaluare nu a fost repetat un test manual pe dispozitiv fizic.

Au fost verificate:

- sintaxa tuturor modulelor JavaScript cu `node --check`;
- unicitatea ID-urilor HTML și existența elementelor accesate prin helperul `$()`;
- pornirea aplicației printr-un server HTTP local și disponibilitatea resurselor principale;
- istoricul și amploarea modificărilor dintre reper și versiunea curentă;
- suprafețele de risc: salvare/încărcare, interacțiuni pointer/touch, dependențe externe, accesibilitate, mentenabilitate și existența testelor automate.

## 2. Progres față de reperul anterior

Progresul este **evident**, nu doar cosmetic.

### Dovezi observabile

- Între `d57086c` și versiunea auditată sunt 40 de commituri și aproximativ 1.892 de linii adăugate față de 919 eliminate în cele 10 fișiere schimbate.
- Codul este împărțit acum în module cu responsabilități mai clare: desenare, stare/configurare a dreptelor, actualizarea scării, puncte speciale, aranjarea etichetelor și Detail View.
- README-ul descrie explicit funcțiile, regulile de prioritate pentru etichete, comportamentul la schimbarea scării, limitările intenționate ale Detail View și suportul mobil.
- Interacțiunea mobilă nu mai este doar declarată: există o investigație documentată a evenimentului `pointercancel`, soluția țintită cu `touchstart` non-pasiv și o listă de teste efectuate pe telefon real.
- Au fost adăugate funcții importante pentru utilizarea reală: două drepte principale și extensiile lor, puncte de pantă și intersecție, curbă editabilă, salvare/încărcare `.axio`, preview și remaparea valorilor la schimbarea scării.
- Motorul Detail View folosește `requestAnimationFrame`, finalizează poziția la `pointerup` și tratează `pointercancel`/`lostpointercapture`, ceea ce indică o maturizare clară a interacțiunilor față de un demo simplu.

Commiturile cu mesaje generice (`Update app.js`, `Add files via upload`) reduc trasabilitatea, dar nu anulează progresul demonstrabil din diff și din comportamentul documentat. Nu este necesară explicarea fiecărei încercări; pentru o versiune publică ar fi însă util un tag/release și un changelog scurt, orientat pe rezultate.

## 3. Ce este deja solid

### Funcționalitate

- Setul de funcții este coerent pentru scopul educațional și acoperă un flux complet: configurare, desen, inspecție, salvare și reîncărcare.
- Conversiile dintre valori și coordonate și actualizarea scării au fost extrase din fișierul principal.
- Salvarea este locală, fără backend și fără conturi; acest lucru menține mică suprafața de atac și simplifică distribuția.
- Inserările dinamice inspectate construiesc în principal SVG controlat intern. Etichetele introduse de utilizator sunt aplicate ca text, nu ca HTML, deci nu a fost identificat un vector XSS evident în fluxul normal.

### Interacțiune și mobil

- Țintele tactile invizibile măresc zona de prindere fără a altera reprezentarea vizuală.
- Prevenirea scrollului este limitată la țintele SVG draggable, în loc să blocheze întreaga foaie.
- Foaia și panoul sunt gândite să poată fi navigate separat pe ecrane mici.

### Documentație

- Deciziile neobișnuite (sensul dragului, cele trei zone inițiale, resetarea extensiilor și curbei) sunt explicate, ceea ce reduce riscul ca un viitor refactor să „repare” un comportament intenționat.
- Jurnalul mobil este suficient de detaliat pentru a reproduce raționamentul tehnic.

## 4. Ce blochează verdictul „production-ready”

### P0 — înainte de a promite fiabilitate utilizatorilor

1. **Nu există teste automate.** Repository-ul nu are nici măcar un test pentru conversiile de scară, round-trip-ul save/load sau starea dreptelor. Acestea sunt exact zonele unde o regresie poate corupe silențios o lucrare.
2. **Fișierele `.axio` nu au schemă și versiune validate.** Încărcarea face `JSON.parse` și apoi aplică starea. Tratarea JSON-ului invalid există, dar lipsesc validarea structurii, limite pentru valori, migrarea între versiuni și un mesaj distinct pentru fișier incompatibil. Un fișier vechi sau modificat poate produce stare parțială ori erori târzii.
3. **Nu există o matrice de browser/dispozitiv executată reproductibil.** Testul pe telefon real este valoros, dar pentru lansare sunt necesare cel puțin Chrome/Edge, Firefox și Safari, plus touch pe Android și iOS, cu scenarii documentate.

### P1 — necesar pentru o lansare publică serioasă

4. **`app.js` rămâne un monolit de peste 2.100 de linii.** Modularizarea este un progres real, dar orchestrarea, evenimentele, persistența și mare parte din starea globală sunt încă strâns cuplate. Riscul de regresie crește la orice funcție nouă.
5. **Accesibilitatea nu este închisă.** Multe inputuri se bazează pe text vizual/placeholder fără asociere semantică prin `<label>`, iar instrumentele principale sunt optimizate pentru pointer. Trebuie verificată navigarea completă cu tastatura, focusul vizibil, denumirile accesibile și un cititor de ecran.
6. **Aplicația depinde de Google Fonts la rulare.** Va funcționa cu fallback dacă rețeaua sau serviciul e blocat, dar aspectul poate diferi; există și implicații de confidențialitate/CSP. Pentru distribuție controlată, fonturile ar trebui găzduite local sau fallback-ul acceptat și testat explicit.
7. **Lipsește infrastructura de calitate.** Nu există `package.json`, scripturi standard, lint/format, CI, test runner, politică de versiuni sau release. Un server static poate publica aplicația, dar repository-ul nu poate demonstra automat că o schimbare este sigură.
8. **Există resturi și inconsistențe de produs.** `gridValidation.js` este practic gol, titlul paginii și numele fișierelor salvate folosesc `AxioGraph_4`, în timp ce produsul/repository-ul folosesc AxioGraph Lab. TODO-ul mobil rămas în cod trebuie fie transformat în issue, fie închis ca decizie intenționată.

### P2 — îmbunătățiri recomandate

9. Adăugarea unei limite de dimensiune pentru fișierul încărcat și revocarea clară a formatelor necunoscute.
10. Mesaje de eroare în interfață în loc de `alert` plus `console.error`, cu instrucțiuni de recuperare.
11. Profilare pe dispozitive mai lente înainte de optimizarea rendererului Detail View; reconstrucția SVG la fiecare cadru nu trebuie rescrisă preventiv, dar trebuie măsurată.
12. Metadate de publicare: favicon, descriere, licență, politică de confidențialitate (chiar dacă spune că datele rămân locale) și instrucțiuni de deployment.

## 5. Verdict

### Clasificare actuală: **beta funcțională / prototip avansat**

Aplicația este suficient de matură pentru:

- demonstrații;
- testare în clasă sau laborator cu un grup controlat;
- pilot în care utilizatorii știu să păstreze copii ale fișierelor;
- colectarea de feedback înaintea rescrierii.

Nu este încă suficient de demonstrabilă pentru calificativul **production-ready**, mai ales dacă „producție” înseamnă că lucrările utilizatorilor nu trebuie pierdute și că aplicația trebuie susținută pe browsere diferite. Blocajul nu este lipsa funcțiilor, ci lipsa plasei de siguranță: teste, validarea formatului salvat, compatibilitate verificată și automatizare de release.

O lansare limitată poate fi făcută onest sub eticheta **beta**, cu o recomandare vizibilă de backup și o listă de browsere suportate. Pentru producție, pragul minim recomandat este închiderea punctelor P0 și a primelor cinci puncte P1.

## 6. Despre rescrierea în React

React poate face aplicația să fie mai coerentă și mai ușor de întreținut, în special pentru panoul cu multe controale, stările de activare/dezactivare, validare și mesaje. Totuși, React nu va îmbunătăți automat grafica SVG și nici nu rezolvă testarea, accesibilitatea sau validarea `.axio`.

Recomandarea este o migrare incrementală, nu o rescriere „big bang”:

1. se definesc mai întâi schema versionată `.axio` și teste pentru conversiile matematice;
2. modulele pure existente (scară, geometrie, configurare) sunt păstrate și testate;
3. panoul de control și persistența sunt mutate în componente React;
4. rendererul SVG este încapsulat apoi, menținând comportamentul pointer/touch deja verificat;
5. se adaugă teste end-to-end pe aceleași scenarii înainte și după migrare.

Da, în React interfața poate arăta și evolua mai bine, mai ales dacă este introdus un design system coerent. Dar versiunea actuală merită stabilizată întâi ca reper comportamental; altfel, rescrierea riscă să piardă tocmai progresul dificil obținut la touch și Detail View.

## 7. Plan minim de promovare din beta în producție

1. **Contract de date:** `formatVersion`, validare strictă, limite și test save → load → aceeași stare.
2. **Teste unitare:** coordonate/scări, clamp/snap, remaparea dreptelor, prioritățile etichetelor.
3. **Teste end-to-end:** adăugare punct, drag dreptă, extensie, curbă, Detail View, preview, save/load și schimbarea scării.
4. **Compatibilitate:** matrice browser + două dispozitive touch reale, cu rezultate în release notes.
5. **Accesibilitate:** label-uri, tastatură, focus, contrast și audit cu unelte automate plus verificare manuală.
6. **Livrare:** CI pentru syntax/lint/test, versiune/tag, changelog și deployment static cu headere CSP adecvate.
7. **Curățenie:** redenumire consecventă AxioGraph Lab, eliminarea fișierului gol și mutarea TODO-urilor în issue tracker.

După acești pași, verdictul poate trece realist de la „prototip avansat” la „versiune 1.0 de producție”.

# VERA

![](./client/public/vera_eye.svg)

## Namnet

**V**ideoanalys och  
**E**vidensbaserad  
**R**apportering och  
**A**nnotation

## Git

Vera har 3 "huvudgrenar" `main`, `testing` och `dev`.

### Grenar

- `main` - Den stabila grenen som alltid ska gå att hämta
  en fungerande version från.
- `testing` - Tar emot förändringar från `dev` som behöver
  testas och verifieras att de fungerar innan de får merge:as
  in i `main`.
- `dev` - Förkortning av "development" är en gemensam gren
  som man bör arbeta ifrån. Nya funktioner kommer att baseras
  på och sedan merge:as tillbaka in i `dev`.

### Tester

Tester skrivs huvudsakligen i `dev` grenen när eller precis
efter att du skrivit en ny funktion. På så sätt skrivs
relevanta tester vid behov, av den som förstår vad som
ska hända. Testerna som skrivs på `dev` är "unit tester"
eller liknande.

`dev` merge:as kontinuerligt in i `testing` efter behov.
Troligtvis sker detta vid milstolpar som ska redovisas.
I testing grenen sker då större regression-/
integrationstestning som som inte är lika möjligt att
utföra på `dev`.

### Arbetsmetodik

När en ny funktion ska skrivas börjar man med att skapa
en ny gren från development grenen. Säkerställ först att du
är på `dev` grenen och kör sedan:

```
git checkout -b <mitt_gren_namn>
```

Ett rimligt grennamn att välja kan vara vad funktionen man
ska arbeta på är, exempelvis "drag_n_drop_files".

När du är klar med funktionen ser du till att dina senaste
förändringar finns på Github. Därifrån gör du en `pull 
request` från din gren till `dev`. När din `pull request`
är skapad så kommer troligtvis vissa automatiska tester att
köras av Github. Du behöver även vänta på att minst en
annan gruppmedlem kontrollerar koden du skrivit och
accepterar de.

Vid behov kan en ny "feature branch" skapas på en annan.
Men då behöver den merge:as tillbaka in i grenen den
skapades från, innan något merge:as in i `dev`.

---

### Krav

För att använda våra skript som hjälper till med hämtning av dependencies samt byggande av projekt behövs `Python3`.

För att kunna köra projektet behöver du ha Node.js installerat. Du kan ladda ner det från [Node.js officiella hemsida](https://nodejs.org/).

Rekommenderad version är Node.js 20.x LTS eller senare.

För att verifiera att Node.js och npm är installerat, kör:

```bash
   node -v
   npm -v
```

Du behöver även ha `make` `cmake` och `clang` för att kunna
webservern som är skriven i `C++`.

### Dependencies

Vera använder en del paket på server sidan som behöver installeras. Dessa inkluderar bland annat FFmpeg och OpenCV.
Exakta paket varierar beroende på OS och distro (om man använder Linux).

För ubuntu Linux är de dokumenterade
```
sudo apt-get install -y clang-tidy clang-format cmake libgtest-dev libopencv-dev python3-opencv libvtk9-dev ffmpeg
```

## Setup

För att sätta upp projektet lokalt, följ dessa steg:

1. Klona repot:

```bash
   git clone git@github.com:PUM-4-2025/vera.git
   cd vera
```

2. Kör setup.py:

```bash
   python3 setup.py
```

När det kommer en ruta med alternativ, välj `--legacy-peer-deps`.

3. Starta utvecklingsservern:

```bash
   python3 run.py
```

Med detta kommando kommer VERA köras i `dev` läge. Då körs
en C++ baserad webserver på port 8000 som hanterar api:n
samt en node-js server kör hemsidan på port 3000.

**Alternativt** om du ska köra i en produktionsmiljö kör
man:

```bash
   python3 run.py --production
```

Då körs vera i optimerat läge. Det innebär även att både
webservern och hemsidan körs på port 8000.

För mer information om vilka alternativ som finns när man kör Vera kan
man använda kommandot:
```bash
python3 run.py --help 
```

## Kända buggar/problem

Då Vera byggdes med många krav och väldigt begränsad tid finns tyvärr
en del buggar och oväntat beteende kvar. I denna del försöker vi 
dokumentera de som är kända.

### Frontend (`client/`)

 - **Äkta bilder visar fel ibland** - Då spelaren använder sig av HTML5 video-tagen så räknar den var den är i tid. För att hämta en bild krävs dock att man vet vilket bildnummer man är på. Vid omvandling från tid till bild nummer kan det ske små avrundningsfel, dessa gör att man ibland hamnar en bild före eller efter videons bild.

 - **Motion detection rutan ger värden som är out of bounds för video** - Då man kan zooma och panorera en video så krävs vissa beräkningar för att omvandla koordinater av rutan i videospelaren till koordinater i videon som spelas. Detta var ett problem i tidiga versioner av motion detection, oklart ifall det finns kvar, eller till vilken utsträckning det sker nu.

 - **Drag-n-Drop öppnar en ny filhanterare**

 - **När man öppnar sidebars eller förändrar storleken på webbläsaren blir offsets fel relativt den nya storleken**

 - **Ibland fungerar inte raw frame** - Ibland klarar inte "raw frame" funktionen av att hämta den "äkta" (icke-interpolerade) bilden ur en video. Det är oklart när eller varför detta sker. Ett känt fall är för videor som redan ligger i ett existerande projekt när man öppnar det.

 - **Vissa videor fungerar inte att extrahera metadata ifrån** - På grund av att olika videoformat lägger sin metadata på olika ställen har Vera problem att extrahera metadata från vissa typer av filformat.

 - **Flera motion detection fungerar inte** - På grund av att motion detection var bland det sista som implementerades hann inte funktionaliteten testas tillräckligt. Därför är buggen inte helt förstådd, men det verkar som att man inte kan utföra mer än en motion detection analys per klient instans.

 - **Autentisering** - Då vi inte skulle köra vera på en extern server fanns inga krav på autentisering. Vi skapade därför bara en väldigt grundläggande idé om att olika användare har egna mappar att laddar upp videor i på server sidan. Detta sker automatiskt av servern. Just nu är autentisering gjord via en sträng som vi kallat för en token eller UserSession som är hårdkodad i klienten. När man startar servern finns inte denna token, den läggs endast till i servern när en ny klient kopplar upp sig till välkomstskärmen (alltså / i url:en).  

### Backend (`server/`)

 - **Mongoose är singel-trådat** - Vera byggdes med asynkron/multi-trådad programmering i åtanke. Därför finns redan mutexer i koden för att säkerställa att race-conditions inte kan ske. Dock upptäcktes det att `Mongoose` kör requests på samma tråd som de kommer in på. Det finns sätt att köra `Mongoose` multi-trådat enligt deras [officiella dokumentation](https://mongoose.ws/documentation/tutorials/core/multi-threaded/). Som konsekvens gör det att tyngre anrop, specifikt "motion detection" fryser hela servern och köar alla nya anrop tills analysen är klar och `Mongoose` kan fortsätta tömma kön. Ett väldigt snabbt försök att multi-tråda gjordes på grenen som heter `multi-mongoose`, förändringarna berör främst `http_server.h` och `http_server.cpp`.

 - **Ingen motion detection vid små ytor** - Om en för liten yta ritas upp när man ska utföra "motion detection" sker inte analysen korrekt.
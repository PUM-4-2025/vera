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
För att kunna köra projektet behöver du ha Node.js installerat. Du kan ladda ner det från [Node.js officiella hemsida](https://nodejs.org/).


Rekommenderad version är Node.js 20.x LTS eller senare.

För att verifiera att Node.js och npm är installerat, kör:
```bash
   node -v
   npm -v
```

Du behöver även ha `make` `cmake` och `clang` för att kunna 
webservern som är skriven i `C++`. 

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
När det kommer en ruta med alternativ, välj ```--legacy-peer-deps```.

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
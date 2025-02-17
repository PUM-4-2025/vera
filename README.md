# VERA

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
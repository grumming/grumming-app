export interface CityGroup {
  state: string;
  cities: string[];
}

export interface DistrictGroup {
  district: string;
  cities: string[];
}

export interface StateWithDistricts {
  state: string;
  districts: DistrictGroup[];
}

// Comprehensive data with State → District → Cities hierarchy
export const indianStatesWithDistricts: StateWithDistricts[] = [
  {
    state: "Andhra Pradesh",
    districts: [
      { district: "Visakhapatnam", cities: ["Visakhapatnam", "Anakapalle", "Bheemunipatnam"] },
      { district: "Krishna", cities: ["Vijayawada", "Machilipatnam", "Gudivada"] },
      { district: "Guntur", cities: ["Guntur", "Tenali", "Narasaraopet", "Chilakaluripet"] },
      { district: "Nellore", cities: ["Nellore", "Kavali", "Gudur"] },
      { district: "Kurnool", cities: ["Kurnool", "Nandyal", "Adoni"] },
      { district: "East Godavari", cities: ["Rajahmundry", "Kakinada", "Amalapuram", "Peddapuram", "Mandapeta"] },
      { district: "West Godavari", cities: ["Eluru", "Bhimavaram", "Tadepalligudem", "Tanuku"] },
      { district: "Kadapa", cities: ["Kadapa", "Proddatur", "Rajampet"] },
      { district: "Chittoor", cities: ["Tirupati", "Chittoor", "Madanapalle", "Srikalahasti"] },
      { district: "Anantapur", cities: ["Anantapur", "Hindupur", "Dharmavaram", "Guntakal", "Tadipatri"] },
      { district: "Srikakulam", cities: ["Srikakulam", "Palasa", "Rajam", "Amadalavalasa"] },
      { district: "Vizianagaram", cities: ["Vizianagaram", "Bobbili", "Parvathipuram"] },
      { district: "Prakasam", cities: ["Ongole", "Markapur", "Chirala"] },
    ]
  },
  {
    state: "Arunachal Pradesh",
    districts: [
      { district: "Papum Pare", cities: ["Itanagar", "Naharlagun", "Nirjuli"] },
      { district: "East Siang", cities: ["Pasighat", "Mebo"] },
      { district: "Tawang", cities: ["Tawang", "Jang"] },
      { district: "Lower Subansiri", cities: ["Ziro", "Hapoli"] },
      { district: "West Kameng", cities: ["Bomdila", "Dirang"] },
      { district: "Lower Dibang Valley", cities: ["Roing"] },
      { district: "Lohit", cities: ["Tezu", "Wakro"] },
      { district: "West Siang", cities: ["Along", "Basar"] },
      { district: "Changlang", cities: ["Changlang", "Nampong"] },
    ]
  },
  {
    state: "Assam",
    districts: [
      { district: "Kamrup Metropolitan", cities: ["Guwahati", "Dispur"] },
      { district: "Cachar", cities: ["Silchar", "Lakhipur"] },
      { district: "Dibrugarh", cities: ["Dibrugarh", "Naharkatia"] },
      { district: "Jorhat", cities: ["Jorhat", "Titabar", "Mariani"] },
      { district: "Sonitpur", cities: ["Tezpur", "Dhekiajuli"] },
      { district: "Nagaon", cities: ["Nagaon", "Hojai", "Lanka"] },
      { district: "Tinsukia", cities: ["Tinsukia", "Digboi", "Margherita"] },
      { district: "Bongaigaon", cities: ["Bongaigaon", "Abhayapuri"] },
      { district: "Dhubri", cities: ["Dhubri", "Gauripur"] },
      { district: "Goalpara", cities: ["Goalpara", "Lakhipur"] },
      { district: "Sivasagar", cities: ["Sivasagar", "Nazira"] },
    ]
  },
  {
    state: "Bihar",
    districts: [
      { district: "Patna", cities: ["Patna", "Danapur", "Phulwari Sharif", "Khagaul", "Maner", "Bihta", "Digha", "Kankarbagh", "Bankipur"] },
      { district: "Gaya", cities: ["Gaya", "Bodh Gaya", "Sherghati", "Tekari", "Wazirganj", "Gurua", "Barachatti", "Dobhi", "Manpur"] },
      { district: "Bhagalpur", cities: ["Bhagalpur", "Kahalgaon", "Sultanganj", "Naugachia", "Pirpainti", "Sabour", "Nathnagar", "Jagdishpur", "Bihpur"] },
      { district: "Muzaffarpur", cities: ["Muzaffarpur", "Kanti", "Motipur", "Sahebganj", "Marwan", "Gaighat", "Kurhani", "Paroo", "Bochaha", "Muraul", "Minapur"] },
      { district: "Sitamarhi", cities: ["Sitamarhi", "Dumra", "Bairgania", "Sursand", "Pupri", "Bathnaha", "Riga", "Parihar", "Majorganj", "Sonbarsa"] },
      { district: "Purnia", cities: ["Purnia", "Banmankhi", "Dhamdaha", "Baisi", "Krityanand Nagar", "Kasba", "Amour", "Rupauli", "Barhara Kothi"] },
      { district: "Kishanganj", cities: ["Kishanganj", "Bahadurganj", "Thakurganj", "Pothia", "Kochadhaman", "Terhagachh", "Dighalbank"] },
      { district: "Araria", cities: ["Araria", "Forbesganj", "Raniganj", "Kursakanta", "Narpatganj", "Jokihat", "Sikti", "Palasi"] },
      { district: "Darbhanga", cities: ["Darbhanga", "Laheriasarai", "Benipur", "Jale", "Singhwara", "Baheri", "Kusheshwar Sthan", "Ghanshyampur", "Keoti"] },
      { district: "Madhubani", cities: ["Madhubani", "Jhanjharpur", "Benipatti", "Phulparas", "Khajauli", "Laukaha", "Babubarhi", "Rahika", "Ladania", "Bisfi"] },
      { district: "Samastipur", cities: ["Samastipur", "Rosera", "Dalsinghsarai", "Patori", "Mohiuddinnagar", "Hasanpur", "Bibhutipur", "Sarairanjan", "Shivajinagar", "Warisnagar"] },
      { district: "Nalanda", cities: ["Bihar Sharif", "Rajgir", "Ekangarsarai", "Harnaut", "Islampur", "Hilsa", "Biharsharif", "Rahui", "Asthawan", "Sarmera", "Noorsarai"] },
      { district: "Bhojpur", cities: ["Arrah", "Jagdishpur", "Shahpur", "Piro", "Koilwar", "Barhara", "Behea", "Garhani", "Sandesh", "Agiaon", "Charpokhari", "Tarari"] },
      { district: "Buxar", cities: ["Buxar", "Dumraon", "Buxar Nagar", "Chausa", "Itarhi", "Rajpur", "Simri", "Nawanagar", "Brahmpur"] },
      { district: "Begusarai", cities: ["Begusarai", "Barauni", "Teghra", "Bachhwara", "Bakhri", "Birpur", "Chhaurahi", "Dandari", "Garhpura", "Matihani", "Naokothi"] },
      { district: "Katihar", cities: ["Katihar", "Manihari", "Barsoi", "Kadwa", "Korha", "Sameli", "Barari", "Pranpur", "Amdabad", "Kursela", "Hasanganj", "Falka"] },
      { district: "Khagaria", cities: ["Khagaria", "Gogri", "Alauli", "Parbatta", "Beldaur", "Chautham", "Mansi"] },
      { district: "Munger", cities: ["Munger", "Jamalpur", "Tarapur", "Kharagpur", "Dharhara", "Bariarpur", "Asarganj", "Haveli Kharagpur", "Sangrampur", "Tetia Bambar"] },
      { district: "Jamui", cities: ["Jamui", "Sikandra", "Sono", "Jhajha", "Chakai", "Laxmipur", "Barhat", "Khaira", "Gidhaur", "Alipur"] },
      { district: "Lakhisarai", cities: ["Lakhisarai", "Halsi", "Pipariya", "Surajgarha", "Barahiya", "Ramgarh Chowk"] },
      { district: "Sheikhpura", cities: ["Sheikhpura", "Barbigha", "Chewara", "Ghat Kusumbha", "Shekhopur Sarai", "Ariari"] },
      { district: "Saran", cities: ["Chapra", "Sonpur", "Marhaura", "Revelganj", "Parsa", "Taraiya", "Amnour", "Dariapur", "Lahladpur", "Sonepur Bazar", "Ekma", "Mashrakh", "Baniapur", "Garkha", "Ishupur"] },
      { district: "Gopalganj", cities: ["Gopalganj", "Hathua", "Phulwaria", "Thawe", "Barauli", "Sidhwalia", "Kateya", "Manjha", "Kuchaikote", "Baikunthpur", "Uchkagaon"] },
      { district: "Saharsa", cities: ["Saharsa", "Simri Bakhtiyarpur", "Salkhua", "Mahishi", "Sonbarsa", "Kahra", "Nauhatta", "Satar Kataiya", "Patarghat", "Banma Itahri"] },
      { district: "Supaul", cities: ["Supaul", "Birpur", "Triveniganj", "Raghopur", "Chhatapur", "Nirmali", "Marauna", "Pipra", "Saraigarh Bhaptiyahi", "Kishanpur"] },
      { district: "Madhepura", cities: ["Madhepura", "Murliganj", "Udakishanganj", "Bihariganj", "Singheshwar", "Gwalpara", "Ghailarh", "Puraini", "Kumarkhand", "Alamnagar"] },
      { district: "Rohtas", cities: ["Sasaram", "Dehri", "Bikramganj", "Dinara", "Dawath", "Karakat", "Nokha", "Nasriganj", "Rajpur", "Tilauthu", "Kochas", "Sanjhauli", "Kargahar", "Sheosagar"] },
      { district: "Aurangabad", cities: ["Aurangabad", "Obra", "Rafiganj", "Daudnagar", "Nabinagar", "Goh", "Kutumba", "Haspura", "Madanpur", "Barun", "Deo"] },
      { district: "Kaimur", cities: ["Bhabua", "Mohania", "Ramgarh", "Chainpur", "Kudra", "Adhaura", "Chand", "Nuaon", "Bhagwanpur", "Rampur", "Durgawati"] },
      { district: "Banka", cities: ["Banka", "Amarpur", "Rajoun", "Katoria", "Barahat", "Belhar", "Bounsi", "Chanan", "Dhoraiya", "Fullidumar", "Shambhuganj"] },
      { district: "Vaishali", cities: ["Hajipur", "Mahua", "Patepur", "Lalganj", "Vaishali", "Bidupur", "Mahnar", "Raghopur", "Jandaha", "Desri", "Sahdei Buzurg", "Rajapakar", "Chehra Kalan", "Bhagwanpur"] },
      { district: "Siwan", cities: ["Siwan", "Maharajganj", "Mairwa", "Raghunathpur", "Barharia", "Guthni", "Andar", "Daraunda", "Basantpur", "Hussainganj", "Pachrukhi", "Goriakothi", "Nautan", "Hasanpura", "Lakri Nabiganj"] },
      { district: "West Champaran", cities: ["Bettiah", "Narkatiaganj", "Bagaha", "Ramnagar", "Lauriya", "Chanpatia", "Majhaulia", "Gaunaha", "Jogapatti", "Mainatand", "Shikarpur", "Thakrahan", "Nautan", "Sikta"] },
      { district: "East Champaran", cities: ["Motihari", "Raxaul", "Mehsi", "Dhaka", "Chakia", "Pakridayal", "Sugauli", "Areraj", "Kesaria", "Paharpur", "Patahi", "Piprakothi", "Adapur", "Banjariya", "Ramgarhwa", "Turkaulia", "Harsidhi", "Kotwa", "Kalyanpur", "Sangrampur", "Phenhara", "Tetaria", "Chiraia", "Ghorasahan"] },
      { district: "Sheohar", cities: ["Sheohar", "Dumri Katsari", "Piprahi", "Tariani Chowk", "Purnahiya"] },
      { district: "Jehanabad", cities: ["Jehanabad", "Makhdumpur", "Kako", "Ghoshi", "Ratni Faridpur", "Modanganj", "Hulasganj"] },
      { district: "Arwal", cities: ["Arwal", "Kurtha", "Kaler", "Karpi", "Banshi", "Sonbhadra Banshi"] },
      { district: "Nawada", cities: ["Nawada", "Rajauli", "Hisua", "Warsaliganj", "Pakribarawan", "Nardiganj", "Kawakol", "Roh", "Akbarpur", "Govindpur", "Meskaur", "Sirdala", "Kashichak"] },
    ]
  },
  {
    state: "Chhattisgarh",
    districts: [
      { district: "Raipur", cities: ["Raipur", "Naya Raipur", "Abhanpur", "Arang", "Tilda Newra", "Simga", "Baloda Bazar", "Bhatapara", "Palari"] },
      { district: "Durg", cities: ["Bhilai", "Durg", "Rajnandgaon", "Patan", "Balod", "Gunderdehi", "Dongargarh", "Khairagarh", "Dhamdha"] },
      { district: "Korba", cities: ["Korba", "Katghora", "Pali", "Kartala", "Korba City", "NTPC Korba", "SECL Korba"] },
      { district: "Bilaspur", cities: ["Bilaspur", "Ratanpur", "Kota", "Takhatpur", "Lormi", "Mungeli", "Patharia", "Masturi", "Sipat"] },
      { district: "Bastar", cities: ["Jagdalpur", "Kondagaon", "Narayanpur", "Dantewada", "Bijapur", "Sukma", "Konta", "Bakawand"] },
      { district: "Raigarh", cities: ["Raigarh", "Sarangarh", "Dharamjaigarh", "Lailunga", "Kharsia", "Pusaur", "Tamnar"] },
      { district: "Surguja", cities: ["Ambikapur", "Surajpur", "Balrampur", "Wadrafnagar", "Ramanujganj", "Lakhanpur", "Pratappur", "Premnagar"] },
      { district: "Koriya", cities: ["Baikunthpur", "Chirmiri", "Manendragarh", "Janakpur", "Bharatpur Sonhat", "Khadgawan"] },
      { district: "Dhamtari", cities: ["Dhamtari", "Kurud", "Nagri", "Magarlod", "Sihawa"] },
      { district: "Mahasamund", cities: ["Mahasamund", "Saraipali", "Bagbahra", "Pithora", "Basna", "Komakhan"] },
      { district: "Janjgir-Champa", cities: ["Janjgir", "Champa", "Naila Janjgir", "Sakti", "Akaltara", "Pamgarh", "Jaijaipur", "Malkharoda"] },
      { district: "Kanker", cities: ["Kanker", "Charama", "Bhanupratappur", "Antagarh", "Narharpur", "Pakhanjur", "Koyalibeda"] },
      { district: "Kabirdham", cities: ["Kawardha", "Pandariya", "Bodla", "Sahaspur Lohara", "Kawardha City"] },
      { district: "Jashpur", cities: ["Jashpurnagar", "Kunkuri", "Pathalgaon", "Bagicha", "Duldula", "Farsabahar", "Manora"] },
      { district: "Gariaband", cities: ["Gariaband", "Mainpur", "Chhura", "Deobhog", "Fingeshwar", "Rajim"] },
      { district: "Mungeli", cities: ["Mungeli", "Lormi", "Patharia", "Mungeli Town"] },
      { district: "Balod", cities: ["Balod", "Dondi", "Gunderdehi", "Dondi Lohara", "Gurur"] },
      { district: "Bemetara", cities: ["Bemetara", "Saja", "Berla", "Nawagarh", "Thankhammer"] },
      { district: "Baloda Bazar", cities: ["Baloda Bazar", "Bhatapara", "Simga", "Kasdol", "Bilaigarh", "Palari"] },
      { district: "Gaurela-Pendra-Marwahi", cities: ["Gaurela", "Pendra", "Marwahi", "Kachhar", "Barsoor"] },
      { district: "Sukma", cities: ["Sukma", "Konta", "Chintagufa", "Chhindgarh", "Dornapal", "Golapalli"] },
      { district: "Narayanpur", cities: ["Narayanpur", "Orchha", "Rowghat", "Chhote Dongar"] },
      { district: "Bijapur", cities: ["Bijapur", "Bhairamgarh", "Usoor", "Bhopalpatnam", "Madded"] },
      { district: "Dantewada", cities: ["Dantewada", "Geedam", "Kuakonda", "Katekalyan", "Barsur"] },
    ]
  },
  {
    state: "Goa",
    districts: [
      { district: "North Goa", cities: ["Panaji", "Mapusa", "Bicholim", "Pernem", "Calangute", "Candolim", "Anjuna", "Valpoi"] },
      { district: "South Goa", cities: ["Margao", "Vasco da Gama", "Ponda", "Curchorem", "Cuncolim", "Sanguem", "Canacona", "Quepem", "Benaulim"] },
    ]
  },
  {
    state: "Gujarat",
    districts: [
      { district: "Ahmedabad", cities: ["Ahmedabad", "Sanand", "Dholka", "Bavla", "Detroj-Rampura", "Viramgam", "Dhandhuka", "Daskroi", "Mandal", "Ranpur", "Barwala"] },
      { district: "Surat", cities: ["Surat", "Bardoli", "Kamrej", "Mandvi", "Mangrol", "Mahuva", "Olpad", "Palsana", "Umarpada", "Chorasi", "Limbayat", "Varachha", "Katargam", "Pandesara"] },
      { district: "Vadodara", cities: ["Vadodara", "Dabhoi", "Chhota Udepur", "Karjan", "Padra", "Shinor", "Vaghodia", "Savli", "Sankheda", "Bodeli", "Naswadi"] },
      { district: "Rajkot", cities: ["Rajkot", "Gondal", "Jetpur", "Dhoraji", "Upleta", "Kotda Sangani", "Jasdan", "Paddhari", "Lodhika", "Jamkandorna", "Morbi"] },
      { district: "Bhavnagar", cities: ["Bhavnagar", "Mahuva", "Sihor", "Talaja", "Palitana", "Ghogha", "Vallabhipur", "Umrala", "Botad", "Garibpura", "Gariadhar"] },
      { district: "Jamnagar", cities: ["Jamnagar", "Dwarka", "Khambhalia", "Okha", "Lalpur", "Jodia", "Jamjodhpur", "Kalyanpur", "Bhanvad", "Kalavad", "Sikka"] },
      { district: "Junagadh", cities: ["Junagadh", "Veraval", "Mangrol", "Keshod", "Vanthali", "Mendarda", "Visavadar", "Malia", "Manavadar", "Bhesan", "Talala Gir"] },
      { district: "Gandhinagar", cities: ["Gandhinagar", "Kalol", "Mansa", "Dehgam", "Pethapur", "Raysan", "Chiloda", "Uvarsad"] },
      { district: "Kutch", cities: ["Bhuj", "Gandhidham", "Mandvi", "Mundra", "Anjar", "Adipur", "Nakhatrana", "Rapar", "Lakhpat", "Abdasa", "Dayapar", "Khavda"] },
      { district: "Anand", cities: ["Anand", "Petlad", "Khambhat", "Borsad", "Sojitra", "Umreth", "Vallabh Vidyanagar", "Karamsad", "Tarapur", "Anklav"] },
      { district: "Morbi", cities: ["Morbi", "Wankaner", "Halvad", "Tankara", "Maliya Miyana", "Navlakhi", "Ghuntu"] },
      { district: "Mehsana", cities: ["Mehsana", "Visnagar", "Unjha", "Patan", "Sidhpur", "Kheralu", "Vadnagar", "Vijapur", "Radhanpur", "Chanasma", "Becharaji"] },
      { district: "Bharuch", cities: ["Bharuch", "Ankleshwar", "Dahej", "Jambusar", "Vagra", "Hansot", "Amod", "Netrang", "Valia", "Jhagadia"] },
      { district: "Navsari", cities: ["Navsari", "Bilimora", "Gandevi", "Jalalpore", "Chikhli", "Maroli", "Khergam", "Vansda", "Bansda"] },
      { district: "Valsad", cities: ["Valsad", "Vapi", "Dharampur", "Pardi", "Umbergaon", "Kaprada", "Tithal", "Atul", "Bilimora"] },
      { district: "Porbandar", cities: ["Porbandar", "Ranavav", "Kutiyana", "Porbandar Taluka"] },
      { district: "Panchmahal", cities: ["Godhra", "Halol", "Kalol", "Shahera", "Morva Hadaf", "Ghoghamba", "Jhalod", "Lunawada", "Santrampur", "Kadana"] },
      { district: "Banaskantha", cities: ["Palanpur", "Deesa", "Dhanera", "Tharad", "Vav", "Amirgadh", "Dantiwada", "Bhabhar", "Kankrej", "Lakhani", "Vadgam"] },
      { district: "Dahod", cities: ["Dahod", "Limkheda", "Jhalod", "Fatepura", "Garbada", "Devgadh Baria", "Sanjeli", "Dhanpur"] },
      { district: "Surendranagar", cities: ["Surendranagar", "Wadhwan", "Limbdi", "Chotila", "Sayla", "Muli", "Lakhtar", "Thangadh", "Dhrangadhra", "Halvad"] },
      { district: "Amreli", cities: ["Amreli", "Savarkundla", "Rajula", "Jafrabad", "Dhari", "Khambha", "Lathi", "Liliya", "Babra", "Kunkavav Vadia"] },
      { district: "Sabarkantha", cities: ["Himmatnagar", "Modasa", "Idar", "Khedbrahma", "Talod", "Prantij", "Vadali", "Bhiloda", "Meghraj", "Dhansura"] },
      { district: "Kheda", cities: ["Nadiad", "Kapadvanj", "Thasra", "Mehmedabad", "Kathlal", "Galteshwar", "Mahudha", "Kheda", "Matar", "Vaso"] },
      { district: "Aravalli", cities: ["Modasa", "Bhiloda", "Malpur", "Meghraj", "Dhansura", "Bayad"] },
      { district: "Botad", cities: ["Botad", "Gadhada", "Ranpur", "Barvala"] },
      { district: "Gir Somnath", cities: ["Veraval", "Una", "Kodinar", "Sutrapada", "Talala Gir", "Gir Gadhada"] },
      { district: "Devbhoomi Dwarka", cities: ["Dwarka", "Khambhalia", "Kalyanpur", "Bhanvad", "Okha", "Bet Dwarka"] },
      { district: "Narmada", cities: ["Rajpipla", "Tilakwada", "Dediapada", "Sagbara", "Nandod", "Statue of Unity"] },
      { district: "Tapi", cities: ["Vyara", "Songadh", "Uchchhal", "Nizar", "Valod", "Dolvan", "Kukarmunda"] },
      { district: "Dang", cities: ["Ahwa", "Waghai", "Subir", "Saputara"] },
      { district: "Mahisagar", cities: ["Lunawada", "Santrampur", "Kadana", "Khanpur", "Balasinor", "Virpur"] },
      { district: "Chhota Udepur", cities: ["Chhota Udepur", "Kawant", "Naswadi", "Jetpur Pavi", "Sankheda", "Bodeli"] },
    ]
  },
  {
    state: "Haryana",
    districts: [
      { district: "Faridabad", cities: ["Faridabad", "Ballabgarh"] },
      { district: "Gurugram", cities: ["Gurgaon", "Sohna", "Pataudi", "Manesar"] },
      { district: "Rohtak", cities: ["Rohtak", "Kalanaur", "Meham"] },
      { district: "Panipat", cities: ["Panipat", "Samalkha", "Israna"] },
      { district: "Karnal", cities: ["Karnal", "Taraori", "Nilokheri"] },
      { district: "Sonipat", cities: ["Sonipat", "Ganaur", "Gohana"] },
      { district: "Yamunanagar", cities: ["Yamunanagar", "Jagadhri", "Radaur"] },
      { district: "Panchkula", cities: ["Panchkula", "Kalka", "Pinjore"] },
      { district: "Bhiwani", cities: ["Bhiwani", "Charkhi Dadri"] },
      { district: "Ambala", cities: ["Ambala", "Ambala Cantt", "Barara"] },
      { district: "Sirsa", cities: ["Sirsa", "Ellenabad", "Dabwali"] },
      { district: "Hisar", cities: ["Hisar", "Hansi", "Barwala"] },
      { district: "Jind", cities: ["Jind", "Narwana", "Safidon"] },
      { district: "Kaithal", cities: ["Kaithal", "Pehowa", "Cheeka"] },
      { district: "Kurukshetra", cities: ["Kurukshetra", "Thanesar", "Ladwa"] },
      { district: "Rewari", cities: ["Rewari", "Bawal", "Kosli"] },
      { district: "Palwal", cities: ["Palwal", "Hodal"] },
      { district: "Fatehabad", cities: ["Fatehabad", "Tohana", "Ratia"] },
      { district: "Mahendragarh", cities: ["Mahendragarh", "Narnaul", "Ateli"] },
      { district: "Jhajjar", cities: ["Jhajjar", "Bahadurgarh", "Beri"] },
    ]
  },
  {
    state: "Himachal Pradesh",
    districts: [
      { district: "Shimla", cities: ["Shimla", "Kufri", "Theog", "Rohru"] },
      { district: "Kangra", cities: ["Dharamshala", "Kangra", "Palampur", "Baijnath"] },
      { district: "Kullu", cities: ["Kullu", "Manali", "Bhuntar"] },
      { district: "Solan", cities: ["Solan", "Kasauli", "Parwanoo", "Nalagarh", "Baddi"] },
      { district: "Mandi", cities: ["Mandi", "Sundernagar", "Jogindernagar"] },
      { district: "Sirmaur", cities: ["Nahan", "Paonta Sahib", "Rajgarh"] },
      { district: "Hamirpur", cities: ["Hamirpur", "Nadaun"] },
      { district: "Una", cities: ["Una", "Amb", "Gagret"] },
      { district: "Bilaspur", cities: ["Bilaspur", "Ghumarwin"] },
      { district: "Chamba", cities: ["Chamba", "Dalhousie", "Khajjiar"] },
      { district: "Lahaul and Spiti", cities: ["Keylong", "Kaza", "Udaipur"] },
      { district: "Kinnaur", cities: ["Reckong Peo", "Kalpa", "Sangla"] },
    ]
  },
  {
    state: "Jharkhand",
    districts: [
      { district: "Ranchi", cities: ["Ranchi", "Hatia", "Doranda"] },
      { district: "Dhanbad", cities: ["Dhanbad", "Jharia", "Sindri", "Katras"] },
      { district: "East Singhbhum", cities: ["Jamshedpur", "Adityapur", "Gamharia"] },
      { district: "Bokaro", cities: ["Bokaro", "Chas", "Phusro"] },
      { district: "Deoghar", cities: ["Deoghar", "Madhupur"] },
      { district: "Hazaribagh", cities: ["Hazaribagh", "Barhi", "Ichak"] },
      { district: "Giridih", cities: ["Giridih", "Tisri"] },
      { district: "Ramgarh", cities: ["Ramgarh", "Patratu"] },
      { district: "Dumka", cities: ["Dumka", "Saraiyahat"] },
      { district: "West Singhbhum", cities: ["Chaibasa", "Chakradharpur"] },
      { district: "Chatra", cities: ["Chatra", "Simaria"] },
      { district: "Koderma", cities: ["Koderma", "Jhumri Telaiya"] },
      { district: "Lohardaga", cities: ["Lohardaga"] },
      { district: "Gumla", cities: ["Gumla", "Bishunpur"] },
      { district: "Simdega", cities: ["Simdega"] },
      { district: "Sahebganj", cities: ["Sahebganj", "Rajmahal"] },
      { district: "Pakur", cities: ["Pakur", "Litipara"] },
      { district: "Jamtara", cities: ["Jamtara", "Nala"] },
    ]
  },
  {
    state: "Karnataka",
    districts: [
      { district: "Bengaluru Urban", cities: ["Bangalore", "Whitefield", "Electronic City", "Yelahanka"] },
      { district: "Mysuru", cities: ["Mysore", "Nanjangud", "Hunsur"] },
      { district: "Dharwad", cities: ["Hubli", "Dharwad", "Kundgol"] },
      { district: "Dakshina Kannada", cities: ["Mangalore", "Bantwal", "Puttur", "Ullal"] },
      { district: "Belgaum", cities: ["Belgaum", "Athani", "Gokak", "Raibag"] },
      { district: "Kalaburagi", cities: ["Gulbarga", "Sedam", "Shahabad"] },
      { district: "Davangere", cities: ["Davanagere", "Harihara", "Harihar"] },
      { district: "Ballari", cities: ["Bellary", "Hospet", "Sandur"] },
      { district: "Vijayapura", cities: ["Bijapur", "Muddebihal", "Basavana Bagevadi"] },
      { district: "Shivamogga", cities: ["Shimoga", "Bhadravati", "Sagar", "Tirthahalli"] },
      { district: "Tumakuru", cities: ["Tumkur", "Tiptur", "Gubbi", "Madhugiri"] },
      { district: "Raichur", cities: ["Raichur", "Sindhanur", "Manvi"] },
      { district: "Bidar", cities: ["Bidar", "Basavakalyan", "Bhalki"] },
      { district: "Gadag", cities: ["Gadag", "Ron", "Mundargi"] },
      { district: "Chitradurga", cities: ["Chitradurga", "Challakere", "Davangere"] },
      { district: "Udupi", cities: ["Udupi", "Kundapura", "Karkala"] },
      { district: "Kolar", cities: ["Kolar", "KGF", "Bangarpet", "Mulbagal"] },
      { district: "Mandya", cities: ["Mandya", "Maddur", "Malavalli"] },
      { district: "Hassan", cities: ["Hassan", "Arsikere", "Channarayapatna"] },
      { district: "Chikmagalur", cities: ["Chikmagalur", "Kadur", "Tarikere"] },
      { district: "Bagalkot", cities: ["Bagalkot", "Jamkhandi", "Mudhol"] },
      { district: "Haveri", cities: ["Haveri", "Ranebennur", "Byadgi"] },
      { district: "Koppal", cities: ["Koppal", "Gangavathi", "Kushtagi"] },
      { district: "Yadgir", cities: ["Yadgir", "Shorapur"] },
      { district: "Kodagu", cities: ["Madikeri", "Kushalnagar", "Virajpet"] },
      { district: "Uttara Kannada", cities: ["Karwar", "Dandeli", "Sirsi", "Kumta", "Ankola", "Bhatkal"] },
      { district: "Chamarajanagar", cities: ["Chamarajanagar", "Kollegal", "Gundlupet"] },
      { district: "Ramanagara", cities: ["Ramanagara", "Channapatna", "Kanakapura"] },
      { district: "Chikkaballapur", cities: ["Chikkaballapur", "Gauribidanur", "Sidlaghatta"] },
      { district: "Bengaluru Rural", cities: ["Devanahalli", "Doddaballapur", "Nelamangala", "Hoskote"] },
    ]
  },
  {
    state: "Kerala",
    districts: [
      { district: "Thiruvananthapuram", cities: ["Thiruvananthapuram", "Neyyattinkara", "Attingal", "Varkala"] },
      { district: "Ernakulam", cities: ["Kochi", "Aluva", "Angamaly", "Perumbavoor", "Tripunithura", "Mattancherry", "Fort Kochi"] },
      { district: "Kozhikode", cities: ["Kozhikode", "Vatakara", "Koyilandy", "Feroke"] },
      { district: "Kollam", cities: ["Kollam", "Punalur", "Karunagappally", "Paravur"] },
      { district: "Thrissur", cities: ["Thrissur", "Guruvayur", "Chavakkad", "Kodungallur", "Chalakudy"] },
      { district: "Alappuzha", cities: ["Alappuzha", "Cherthala", "Kayamkulam", "Haripad"] },
      { district: "Kottayam", cities: ["Kottayam", "Changanassery", "Pala", "Vaikom"] },
      { district: "Kannur", cities: ["Kannur", "Thalassery", "Payyanur", "Mattannur"] },
      { district: "Palakkad", cities: ["Palakkad", "Chittur", "Ottapalam", "Shornur"] },
      { district: "Malappuram", cities: ["Malappuram", "Manjeri", "Perinthalmanna", "Tirur", "Ponnani"] },
      { district: "Idukki", cities: ["Thodupuzha", "Munnar", "Adimali", "Kattappana"] },
      { district: "Pathanamthitta", cities: ["Pathanamthitta", "Tiruvalla", "Adoor", "Konni"] },
      { district: "Kasaragod", cities: ["Kasaragod", "Kanhangad", "Nileshwar"] },
      { district: "Wayanad", cities: ["Kalpetta", "Sulthan Bathery", "Mananthavady"] },
    ]
  },
  {
    state: "Madhya Pradesh",
    districts: [
      { district: "Indore", cities: ["Indore", "Mhow", "Pithampur"] },
      { district: "Bhopal", cities: ["Bhopal", "Berasia"] },
      { district: "Jabalpur", cities: ["Jabalpur", "Sihora", "Katni"] },
      { district: "Gwalior", cities: ["Gwalior", "Dabra", "Bhitarwar"] },
      { district: "Ujjain", cities: ["Ujjain", "Nagda", "Barnagar"] },
      { district: "Dewas", cities: ["Dewas", "Sonkatch", "Khategaon"] },
      { district: "Satna", cities: ["Satna", "Maihar", "Rampur Baghelan"] },
      { district: "Sagar", cities: ["Sagar", "Bina", "Khurai"] },
      { district: "Ratlam", cities: ["Ratlam", "Jaora", "Sailana"] },
      { district: "Rewa", cities: ["Rewa", "Waidhan", "Sidhi"] },
      { district: "Chhindwara", cities: ["Chhindwara", "Pandhurna", "Sausar"] },
      { district: "Burhanpur", cities: ["Burhanpur"] },
      { district: "Khandwa", cities: ["Khandwa", "Harda"] },
      { district: "Morena", cities: ["Morena", "Ambah", "Porsa"] },
      { district: "Bhind", cities: ["Bhind", "Lahar", "Gohad"] },
      { district: "Guna", cities: ["Guna", "Ashok Nagar"] },
      { district: "Shivpuri", cities: ["Shivpuri", "Karera", "Pichhore"] },
      { district: "Vidisha", cities: ["Vidisha", "Sironj"] },
      { district: "Mandsaur", cities: ["Mandsaur", "Neemuch", "Jawad"] },
      { district: "Khargone", cities: ["Khargone", "Kasrawad", "Barwaha"] },
      { district: "Damoh", cities: ["Damoh", "Hatta"] },
      { district: "Betul", cities: ["Betul", "Multai", "Amla"] },
      { district: "Seoni", cities: ["Seoni", "Barghat"] },
      { district: "Datia", cities: ["Datia", "Bhander"] },
      { district: "Tikamgarh", cities: ["Tikamgarh", "Jatara"] },
      { district: "Chhatarpur", cities: ["Chhatarpur", "Nowgong"] },
      { district: "Panna", cities: ["Panna", "Ajaygarh"] },
    ]
  },
  {
    state: "Maharashtra",
    districts: [
      { district: "Mumbai City", cities: ["Mumbai", "Colaba", "Fort", "Dadar", "Churchgate", "Marine Lines", "Charni Road", "Grant Road", "Mumbai Central", "Mahalaxmi", "Lower Parel", "Prabhadevi", "Worli", "Haji Ali", "Breach Candy", "Girgaon", "Kalbadevi"] },
      { district: "Mumbai Suburban", cities: ["Andheri", "Bandra", "Borivali", "Malad", "Kandivali", "Goregaon", "Jogeshwari", "Vile Parle", "Santacruz", "Khar", "Juhu", "Versova", "Lokhandwala", "Oshiwara", "Powai", "Vikhroli", "Ghatkopar", "Mulund", "Kurla", "Chembur", "Bhandup", "Nahur", "Kanjurmarg", "Dombivli", "Kalyan"] },
      { district: "Pune", cities: ["Pune", "Pimpri-Chinchwad", "Lonavala", "Khandala", "Talegaon", "Hinjawadi", "Baner", "Wakad", "Hadapsar", "Koregaon Park", "Kothrud", "Shivajinagar", "Aundh", "Viman Nagar", "Kharadi", "Magarpatta", "Baramati", "Shirur", "Daund", "Indapur", "Junnar", "Maval", "Ambegaon", "Velhe", "Bhor", "Purandar", "Haveli", "Mulshi"] },
      { district: "Nagpur", cities: ["Nagpur", "Kamptee", "Hingna", "Saoner", "Katol", "Ramtek", "Parseoni", "Umred", "Kuhi", "Narkhed", "Mauda", "Kalmeshwar", "Nagpur City", "Sitabuldi"] },
      { district: "Thane", cities: ["Thane", "Kalyan", "Dombivli", "Bhiwandi", "Ulhasnagar", "Ambernath", "Badlapur", "Murbad", "Shahapur", "Titwala", "Asangaon", "Navi Mumbai", "Vashi", "Airoli", "Ghansoli", "Kopar Khairane", "Belapur", "Kharghar", "Panvel", "Taloja", "Kalamboli", "Nerul", "Sanpada"] },
      { district: "Nashik", cities: ["Nashik", "Malegaon", "Sinnar", "Trimbakeshwar", "Igatpuri", "Peth", "Surgana", "Dindori", "Kalwan", "Deola", "Satana", "Niphad", "Yeola", "Chandwad", "Manmad", "Nandgaon", "Lasalgaon"] },
      { district: "Aurangabad", cities: ["Aurangabad", "Khuldabad", "Ellora", "Vaijapur", "Paithan", "Phulambri", "Gangapur", "Kannad", "Sillod", "Soegaon"] },
      { district: "Palghar", cities: ["Palghar", "Vasai", "Virar", "Dahanu", "Boisar", "Nalasopara", "Talasari", "Wada", "Jawhar", "Vikramgad", "Mokhada", "Manor"] },
      { district: "Raigad", cities: ["Panvel", "Alibag", "Pen", "Karjat", "Khopoli", "Uran", "Roha", "Mangaon", "Mahad", "Murud", "Shrivardhan", "Mhasla", "Tala", "Poladpur", "Sudhagad"] },
      { district: "Solapur", cities: ["Solapur", "Barshi", "Pandharpur", "Akkalkot", "Karmala", "Madha", "Sangola", "Mangalvedha", "Mohol", "North Solapur", "South Solapur"] },
      { district: "Amravati", cities: ["Amravati", "Achalpur", "Paratwada", "Warud", "Morshi", "Chandur Railway", "Chikhaldara", "Dharni", "Nandgaon Khandeshwar", "Anjangaon Surji", "Daryapur", "Chandur Bazar", "Bhatkuli", "Teosa"] },
      { district: "Nanded", cities: ["Nanded", "Deglur", "Bhokar", "Mukhed", "Kinwat", "Hadgaon", "Himayatnagar", "Kandhar", "Loha", "Mudkhed", "Naigaon", "Umri", "Ardhapur", "Biloli", "Dharmabad", "Mahur"] },
      { district: "Kolhapur", cities: ["Kolhapur", "Ichalkaranji", "Jaysingpur", "Kagal", "Karveer", "Panhala", "Hatkanangle", "Shahuwadi", "Radhanagari", "Gaganbawada", "Chandgad", "Gadhinglaj", "Ajra", "Bhudargad"] },
      { district: "Akola", cities: ["Akola", "Murtijapur", "Akot", "Balapur", "Telhara", "Patur", "Barshitakli"] },
      { district: "Sangli", cities: ["Sangli", "Miraj", "Vita", "Ashta", "Islampur", "Tasgaon", "Kavathe Mahankal", "Jat", "Atpadi", "Kadegaon", "Khanapur Vita", "Palus", "Shirala", "Walwa"] },
      { district: "Jalgaon", cities: ["Jalgaon", "Bhusawal", "Amalner", "Chopda", "Pachora", "Chalisgaon", "Jamner", "Erandol", "Dharangaon", "Raver", "Yawal", "Parola", "Bhadgaon", "Bodwad", "Muktainagar"] },
      { district: "Ahmednagar", cities: ["Ahmednagar", "Shrirampur", "Sangamner", "Shirdi", "Kopargaon", "Akole", "Rahata", "Newasa", "Rahuri", "Shevgaon", "Pathardi", "Parner", "Karjat", "Jamkhed", "Nevasa"] },
      { district: "Latur", cities: ["Latur", "Udgir", "Ausa", "Nilanga", "Renapur", "Chakur", "Deoni", "Ahmedpur", "Shirur Anantpal", "Jalkot"] },
      { district: "Dhule", cities: ["Dhule", "Shirpur", "Sakri", "Shindkheda", "Dondaicha Warwade"] },
      { district: "Satara", cities: ["Satara", "Karad", "Mahabaleshwar", "Panchgani", "Wai", "Phaltan", "Man", "Khatav", "Koregaon", "Javli", "Khandala", "Patan"] },
      { district: "Chandrapur", cities: ["Chandrapur", "Ballarpur", "Warora", "Mul", "Gondpipari", "Brahmapuri", "Sindewahi", "Rajura", "Korpana", "Bhadravati", "Chimur", "Nagbhid", "Sawali", "Pombhurna"] },
      { district: "Parbhani", cities: ["Parbhani", "Jintur", "Pathri", "Sonpeth", "Gangakhed", "Selu", "Manwath", "Purna", "Palam"] },
      { district: "Jalna", cities: ["Jalna", "Partur", "Ambad", "Bhokardan", "Jafrabad", "Badnapur", "Ghansawangi", "Mantha"] },
      { district: "Beed", cities: ["Beed", "Gevrai", "Ashti", "Patoda", "Shirur Kasar", "Majalgaon", "Wadwani", "Kaij", "Dharur", "Parli", "Ambajogai"] },
      { district: "Gondia", cities: ["Gondia", "Tirora", "Arjuni Morgaon", "Amgaon", "Sadak Arjuni", "Goregaon", "Deori", "Salekasa"] },
      { district: "Wardha", cities: ["Wardha", "Hinganghat", "Arvi", "Deoli", "Seloo", "Samudrapur", "Ashti", "Karanja"] },
      { district: "Osmanabad", cities: ["Osmanabad", "Tuljapur", "Paranda", "Bhoom", "Kalamb", "Washi", "Lohara", "Umarga"] },
      { district: "Yavatmal", cities: ["Yavatmal", "Pusad", "Wani", "Darwha", "Digras", "Arni", "Pandharkawada", "Umarkhed", "Ner", "Ghatanji", "Kelapur", "Babhulgaon", "Mahagaon", "Ralegaon", "Kalamb", "Zari Jamani"] },
      { district: "Washim", cities: ["Washim", "Malegaon", "Risod", "Karanja Lad", "Mangrulpir", "Manora"] },
      { district: "Buldhana", cities: ["Buldhana", "Khamgaon", "Chikhli", "Shegaon", "Mehkar", "Malkapur", "Jalgaon Jamod", "Deulgaon Raja", "Lonar", "Motala", "Nandura", "Sangrampur", "Sindkhed Raja"] },
      { district: "Nandurbar", cities: ["Nandurbar", "Shahada", "Dhadgaon", "Akkalkuwa", "Akrani", "Taloda"] },
      { district: "Ratnagiri", cities: ["Ratnagiri", "Chiplun", "Dapoli", "Guhagar", "Mandangad", "Khed", "Lanja", "Rajapur", "Sangameshwar"] },
      { district: "Sindhudurg", cities: ["Sindhudurg", "Sawantwadi", "Kudal", "Malvan", "Vengurla", "Kankavli", "Devgad", "Dodamarg"] },
    ]
  },
  {
    state: "Manipur",
    districts: [
      { district: "Imphal West", cities: ["Imphal", "Lamphel", "Singjamei"] },
      { district: "Imphal East", cities: ["Porompat", "Khelakhong"] },
      { district: "Thoubal", cities: ["Thoubal", "Kakching"] },
      { district: "Bishnupur", cities: ["Bishnupur", "Moirang"] },
      { district: "Churachandpur", cities: ["Churachandpur", "Henglep"] },
      { district: "Ukhrul", cities: ["Ukhrul"] },
      { district: "Senapati", cities: ["Senapati", "Mao"] },
      { district: "Chandel", cities: ["Chandel", "Moreh"] },
    ]
  },
  {
    state: "Meghalaya",
    districts: [
      { district: "East Khasi Hills", cities: ["Shillong", "Cherrapunji", "Mawsynram"] },
      { district: "West Garo Hills", cities: ["Tura", "Dadenggre"] },
      { district: "West Jaintia Hills", cities: ["Jowai", "Dawki"] },
      { district: "East Garo Hills", cities: ["Williamnagar", "Rongjeng"] },
      { district: "Ri Bhoi", cities: ["Nongpoh", "Umiam"] },
      { district: "South Garo Hills", cities: ["Baghmara", "Siju"] },
    ]
  },
  {
    state: "Mizoram",
    districts: [
      { district: "Aizawl", cities: ["Aizawl", "Durtlang", "Bawngkawn"] },
      { district: "Lunglei", cities: ["Lunglei", "Hnahthial"] },
      { district: "Champhai", cities: ["Champhai", "Zokhawthar"] },
      { district: "Serchhip", cities: ["Serchhip", "North Vanlaiphai"] },
      { district: "Kolasib", cities: ["Kolasib", "Kawnpui"] },
      { district: "Lawngtlai", cities: ["Lawngtlai", "Chawngte"] },
      { district: "Mamit", cities: ["Mamit", "Lengpui"] },
    ]
  },
  {
    state: "Nagaland",
    districts: [
      { district: "Kohima", cities: ["Kohima", "Chiephobozou"] },
      { district: "Dimapur", cities: ["Dimapur", "Chumukedima", "Medziphema"] },
      { district: "Mokokchung", cities: ["Mokokchung", "Chuchuyimlang"] },
      { district: "Tuensang", cities: ["Tuensang"] },
      { district: "Wokha", cities: ["Wokha", "Bhandari"] },
      { district: "Zunheboto", cities: ["Zunheboto", "Aghunato"] },
      { district: "Mon", cities: ["Mon", "Longwa"] },
      { district: "Phek", cities: ["Phek", "Pfutsero"] },
      { district: "Peren", cities: ["Peren", "Jalukie"] },
    ]
  },
  {
    state: "Odisha",
    districts: [
      { district: "Khordha", cities: ["Bhubaneswar", "Jatni", "Khordha"] },
      { district: "Cuttack", cities: ["Cuttack", "Choudwar", "Athgarh"] },
      { district: "Sundargarh", cities: ["Rourkela", "Sundargarh", "Rajgangpur"] },
      { district: "Ganjam", cities: ["Brahmapur", "Gopalpur", "Aska"] },
      { district: "Sambalpur", cities: ["Sambalpur", "Burla", "Hirakud"] },
      { district: "Puri", cities: ["Puri", "Konark", "Nimapara"] },
      { district: "Balasore", cities: ["Balasore", "Jaleswar", "Soro"] },
      { district: "Bhadrak", cities: ["Bhadrak", "Chandbali", "Basudevpur"] },
      { district: "Mayurbhanj", cities: ["Baripada", "Rairangpur", "Karanjia"] },
      { district: "Jharsuguda", cities: ["Jharsuguda", "Belpahar", "Brajrajnagar"] },
      { district: "Koraput", cities: ["Jeypore", "Koraput", "Sunabeda"] },
      { district: "Bargarh", cities: ["Bargarh", "Padampur", "Barpali"] },
      { district: "Rayagada", cities: ["Rayagada", "Gunupur"] },
      { district: "Kalahandi", cities: ["Bhawanipatna", "Kesinga", "Dharamgarh"] },
      { district: "Kendrapara", cities: ["Kendrapara", "Pattamundai"] },
      { district: "Jagatsinghpur", cities: ["Paradip", "Jagatsinghpur"] },
      { district: "Dhenkanal", cities: ["Dhenkanal", "Bhuban", "Kamakhyanagar"] },
      { district: "Angul", cities: ["Angul", "Talcher", "Athmallik"] },
      { district: "Keonjhar", cities: ["Kendujhar", "Barbil", "Joda"] },
      { district: "Nabarangpur", cities: ["Nabarangpur", "Umerkote"] },
      { district: "Malkangiri", cities: ["Malkangiri", "Motu"] },
      { district: "Balangir", cities: ["Bolangir", "Titilagarh", "Patnagarh"] },
      { district: "Sonepur", cities: ["Sonepur", "Tarbha"] },
      { district: "Kandhamal", cities: ["Phulbani", "Baliguda", "G.Udayagiri"] },
      { district: "Nayagarh", cities: ["Nayagarh", "Odagaon"] },
      { district: "Jajpur", cities: ["Jajpur", "Jajpur Road", "Byasanagar"] },
      { district: "Boudh", cities: ["Boudh", "Harabhanga"] },
      { district: "Nuapada", cities: ["Nuapada", "Khariar", "Sinapali"] },
      { district: "Subarnapur", cities: ["Sonepur", "Ullunda", "Birmaharajpur"] },
    ]
  },
  {
    state: "Punjab",
    districts: [
      { district: "Ludhiana", cities: ["Ludhiana", "Khanna", "Samrala", "Jagraon"] },
      { district: "Amritsar", cities: ["Amritsar", "Ajnala", "Tarn Taran"] },
      { district: "Jalandhar", cities: ["Jalandhar", "Phagwara", "Nakodar", "Phillaur"] },
      { district: "Patiala", cities: ["Patiala", "Rajpura", "Nabha", "Samana"] },
      { district: "Bathinda", cities: ["Bathinda", "Moga", "Talwandi Sabo"] },
      { district: "SAS Nagar", cities: ["Mohali", "Kharar", "Zirakpur", "Dera Bassi"] },
      { district: "Pathankot", cities: ["Pathankot", "Sujanpur"] },
      { district: "Hoshiarpur", cities: ["Hoshiarpur", "Mukerian", "Dasuya"] },
      { district: "Gurdaspur", cities: ["Gurdaspur", "Batala", "Dera Baba Nanak"] },
      { district: "Sangrur", cities: ["Sangrur", "Malerkotla", "Sunam", "Dhuri"] },
      { district: "Moga", cities: ["Moga", "Dharamkot", "Baghapurana"] },
      { district: "Fazilka", cities: ["Fazilka", "Abohar", "Jalalabad"] },
      { district: "Muktsar", cities: ["Muktsar", "Malout", "Gidderbaha"] },
      { district: "Barnala", cities: ["Barnala", "Tapa"] },
      { district: "Firozpur", cities: ["Firozpur", "Zira", "Jira"] },
      { district: "Kapurthala", cities: ["Kapurthala", "Phagwara", "Sultanpur Lodhi"] },
      { district: "Mansa", cities: ["Mansa", "Budhlada", "Sardulgarh"] },
      { district: "Faridkot", cities: ["Faridkot", "Kotkapura", "Jaitu"] },
      { district: "Rupnagar", cities: ["Rupnagar", "Morinda", "Nangal"] },
      { district: "Fatehgarh Sahib", cities: ["Fatehgarh Sahib", "Sirhind", "Mandi Gobindgarh"] },
      { district: "Nawanshahr", cities: ["Nawanshahr", "Banga", "Rahon"] },
    ]
  },
  {
    state: "Rajasthan",
    districts: [
      { district: "Jaipur", cities: ["Jaipur", "Sanganer", "Chomu", "Amber"] },
      { district: "Jodhpur", cities: ["Jodhpur", "Phalodi", "Pipar City"] },
      { district: "Kota", cities: ["Kota", "Ramganjmandi", "Jhalawar"] },
      { district: "Bikaner", cities: ["Bikaner", "Nokha", "Deshnok"] },
      { district: "Ajmer", cities: ["Ajmer", "Pushkar", "Beawar", "Kishangarh"] },
      { district: "Udaipur", cities: ["Udaipur", "Nathdwara", "Rajsamand"] },
      { district: "Bhilwara", cities: ["Bhilwara", "Gulabpura", "Shahpura"] },
      { district: "Alwar", cities: ["Alwar", "Bhiwadi", "Neemrana", "Behror"] },
      { district: "Bharatpur", cities: ["Bharatpur", "Deeg", "Nagar"] },
      { district: "Sikar", cities: ["Sikar", "Fatehpur", "Lachhmangarh"] },
      { district: "Pali", cities: ["Pali", "Marwar Junction", "Sojat"] },
      { district: "Sri Ganganagar", cities: ["Sri Ganganagar", "Hanumangarh", "Suratgarh"] },
      { district: "Tonk", cities: ["Tonk", "Newai", "Malpura"] },
      { district: "Churu", cities: ["Churu", "Sardarshahar", "Ratangarh", "Sujangarh"] },
      { district: "Jhunjhunu", cities: ["Jhunjhunu", "Pilani", "Chirawa"] },
      { district: "Nagaur", cities: ["Nagaur", "Makrana", "Merta City"] },
      { district: "Baran", cities: ["Baran", "Atru", "Chhabra"] },
      { district: "Bundi", cities: ["Bundi", "Nainwa", "Indergarh"] },
      { district: "Chittorgarh", cities: ["Chittorgarh", "Nimbahera", "Gangrar"] },
      { district: "Pratapgarh", cities: ["Pratapgarh", "Chhoti Sadri"] },
      { district: "Banswara", cities: ["Banswara", "Kushalgarh"] },
      { district: "Dungarpur", cities: ["Dungarpur", "Sagwara"] },
      { district: "Barmer", cities: ["Barmer", "Balotra", "Siwana"] },
      { district: "Jaisalmer", cities: ["Jaisalmer", "Pokhran", "Sam"] },
      { district: "Sirohi", cities: ["Sirohi", "Mount Abu", "Abu Road"] },
      { district: "Jalore", cities: ["Jalore", "Bhinmal", "Raniwara"] },
      { district: "Sawai Madhopur", cities: ["Sawai Madhopur", "Gangapur City", "Bamanwas"] },
      { district: "Dausa", cities: ["Dausa", "Lalsot", "Bandikui"] },
      { district: "Karauli", cities: ["Karauli", "Hindaun", "Todabhim"] },
      { district: "Dholpur", cities: ["Dholpur", "Bari", "Rajakhera"] },
    ]
  },
  {
    state: "Sikkim",
    districts: [
      { district: "East Sikkim", cities: ["Gangtok", "Singtam", "Rangpo"] },
      { district: "South Sikkim", cities: ["Namchi", "Jorethang", "Ravangla"] },
      { district: "North Sikkim", cities: ["Mangan", "Lachung", "Lachen"] },
      { district: "West Sikkim", cities: ["Gyalshing", "Pelling", "Yuksom"] },
    ]
  },
  {
    state: "Tamil Nadu",
    districts: [
      { district: "Chennai", cities: ["Chennai", "Tambaram", "Avadi", "Pallavaram", "Ambattur"] },
      { district: "Coimbatore", cities: ["Coimbatore", "Pollachi", "Mettupalayam", "Tirupur"] },
      { district: "Madurai", cities: ["Madurai", "Melur", "Usilampatti", "Thirumangalam"] },
      { district: "Tiruchirappalli", cities: ["Tiruchirappalli", "Srirangam", "Lalgudi", "Musiri"] },
      { district: "Salem", cities: ["Salem", "Attur", "Mettur", "Omalur"] },
      { district: "Tiruppur", cities: ["Tiruppur", "Avinashi", "Palladam", "Dharapuram"] },
      { district: "Erode", cities: ["Erode", "Bhavani", "Gobichettipalayam", "Sathyamangalam"] },
      { district: "Tirunelveli", cities: ["Tirunelveli", "Palayamkottai", "Ambasamudram", "Tenkasi"] },
      { district: "Vellore", cities: ["Vellore", "Vaniyambadi", "Ambur", "Gudiyatham", "Ranipet"] },
      { district: "Thoothukudi", cities: ["Thoothukudi", "Kovilpatti", "Tiruchendur", "Kayalpattinam"] },
      { district: "Kanyakumari", cities: ["Nagercoil", "Marthandam", "Padmanabhapuram", "Colachel"] },
      { district: "Thanjavur", cities: ["Thanjavur", "Kumbakonam", "Pattukkottai", "Peravurani"] },
      { district: "Dindigul", cities: ["Dindigul", "Palani", "Oddanchatram", "Natham"] },
      { district: "Cuddalore", cities: ["Cuddalore", "Chidambaram", "Vriddachalam", "Panruti"] },
      { district: "Kanchipuram", cities: ["Kanchipuram", "Sriperumbudur", "Mahabalipuram"] },
      { district: "Rajapalayam", cities: ["Rajapalayam", "Srivilliputhur"] },
      { district: "Pudukkottai", cities: ["Pudukkottai", "Aranthangi", "Karaikudi"] },
      { district: "Karur", cities: ["Karur", "Kulithalai"] },
      { district: "Krishnagiri", cities: ["Hosur", "Krishnagiri", "Denkanikottai"] },
      { district: "Dharmapuri", cities: ["Dharmapuri", "Palacode", "Harur"] },
      { district: "Namakkal", cities: ["Namakkal", "Tiruchengode", "Rasipuram", "Paramathi-Velur"] },
      { district: "Villupuram", cities: ["Villupuram", "Tindivanam", "Gingee", "Kallakurichi"] },
      { district: "Virudhunagar", cities: ["Virudhunagar", "Sivakasi", "Aruppukkottai", "Sathur"] },
      { district: "Sivaganga", cities: ["Sivaganga", "Karaikudi", "Devakottai", "Manamadurai"] },
      { district: "Ramanathapuram", cities: ["Ramanathapuram", "Paramakudi", "Rameswaram"] },
      { district: "Thiruvarur", cities: ["Thiruvarur", "Mannargudi", "Nagapattinam"] },
      { district: "Mayiladuthurai", cities: ["Mayiladuthurai", "Sirkazhi", "Poompuhar"] },
      { district: "Ariyalur", cities: ["Ariyalur", "Jayamkondam"] },
      { district: "Tiruvallur", cities: ["Tiruvallur", "Arakkonam", "Ponneri", "Gummidipoondi"] },
      { district: "Perambalur", cities: ["Perambalur", "Kunnam"] },
      { district: "Theni", cities: ["Theni", "Periyakulam", "Bodinayakanur", "Cumbum"] },
      { district: "Nilgiris", cities: ["Ooty", "Coonoor", "Kotagiri", "Gudalur"] },
      { district: "Chengalpattu", cities: ["Chengalpattu", "Mahabalipuram", "Thiruporur"] },
      { district: "Ranipet", cities: ["Ranipet", "Arakkonam", "Walajapet", "Arcot"] },
      { district: "Tiruvannamalai", cities: ["Tiruvannamalai", "Polur", "Arani", "Chengam"] },
      { district: "Tirupattur", cities: ["Tirupattur", "Vaniyambadi", "Ambur"] },
      { district: "Tenkasi", cities: ["Tenkasi", "Sankarankovil", "Shenkottai", "Kadayanallur"] },
    ]
  },
  {
    state: "Telangana",
    districts: [
      { district: "Hyderabad", cities: ["Hyderabad", "Secunderabad", "Jubilee Hills", "Banjara Hills", "HITEC City"] },
      { district: "Warangal Urban", cities: ["Warangal", "Hanamkonda", "Kazipet"] },
      { district: "Rangareddy", cities: ["LB Nagar", "Shamshabad", "Chevella", "Shadnagar"] },
      { district: "Nizamabad", cities: ["Nizamabad", "Bodhan", "Armoor"] },
      { district: "Khammam", cities: ["Khammam", "Kothagudem", "Bhadrachalam", "Palwancha"] },
      { district: "Karimnagar", cities: ["Karimnagar", "Huzurabad", "Jammikunta"] },
      { district: "Medchal-Malkajgiri", cities: ["Malkajgiri", "Medchal", "Kompally", "Kukatpally"] },
      { district: "Nalgonda", cities: ["Nalgonda", "Suryapet", "Miryalaguda", "Devarakonda"] },
      { district: "Mancherial", cities: ["Mancherial", "Ramagundam", "Bellampalli"] },
      { district: "Adilabad", cities: ["Adilabad", "Nirmal", "Bhainsa"] },
      { district: "Siddipet", cities: ["Siddipet", "Gajwel", "Dubbak"] },
      { district: "Kamareddy", cities: ["Kamareddy", "Banswada"] },
      { district: "Jagtial", cities: ["Jagtial", "Koratla", "Dharmapuri"] },
      { district: "Sangareddy", cities: ["Sangareddy", "Zaheerabad", "Narayankhed"] },
      { district: "Vikarabad", cities: ["Vikarabad", "Tandur", "Pargi"] },
      { district: "Medak", cities: ["Medak", "Toopran", "Narsapur"] },
      { district: "Mahbubnagar", cities: ["Mahbubnagar", "Gadwal", "Narayanpet", "Wanaparthy"] },
      { district: "Jangaon", cities: ["Jangaon", "Station Ghanpur"] },
      { district: "Peddapalli", cities: ["Peddapalli", "Sultanabad"] },
      { district: "Bhadradri Kothagudem", cities: ["Kothagudem", "Bhadrachalam", "Yellandu"] },
      { district: "Yadadri Bhuvanagiri", cities: ["Bhongir", "Choutuppal", "Yadagirigutta"] },
    ]
  },
  {
    state: "Tripura",
    districts: [
      { district: "West Tripura", cities: ["Agartala", "Barjala", "Jogendranagar"] },
      { district: "South Tripura", cities: ["Udaipur", "Belonia", "Sabroom"] },
      { district: "North Tripura", cities: ["Dharmanagar", "Kailasahar", "Kumarghat"] },
      { district: "Dhalai", cities: ["Ambassa", "Kamalpur", "Gandacherra"] },
      { district: "Khowai", cities: ["Khowai", "Teliamura"] },
      { district: "Gomati", cities: ["Udaipur", "Amarpur"] },
      { district: "Sepahijala", cities: ["Sonamura", "Bishalgarh"] },
      { district: "Unakoti", cities: ["Kailasahar", "Pecharthal"] },
    ]
  },
  {
    state: "Uttar Pradesh",
    districts: [
      { district: "Lucknow", cities: ["Lucknow", "Mohanlalganj", "Kakori", "Malihabad", "Chinhat", "Itaunja", "Sarojininagar", "Bakshi Ka Talab"] },
      { district: "Kanpur Nagar", cities: ["Kanpur", "Billhaur", "Ghatampur", "Sarsaul", "Patara", "Kakwan", "Shivrajpur"] },
      { district: "Kanpur Dehat", cities: ["Akbarpur", "Pukhrayan", "Derapur", "Rasulabad", "Jhinjhak", "Bhognipur", "Sandalpur"] },
      { district: "Ghaziabad", cities: ["Ghaziabad", "Modinagar", "Murad Nagar", "Loni", "Pilkhuwa", "Hapur", "Khora", "Sahibabad"] },
      { district: "Agra", cities: ["Agra", "Fatehpur Sikri", "Kheragarh", "Etmadpur", "Bah", "Kiraoli", "Achhnera", "Pinahat", "Jaitpur Kalan"] },
      { district: "Meerut", cities: ["Meerut", "Modinagar", "Mawana", "Sardhana", "Kharkhauda", "Parikshitgarh", "Machhra", "Daurala", "Hastinapur"] },
      { district: "Varanasi", cities: ["Varanasi", "Ramnagar", "Pindra", "Cholapur", "Sewapuri", "Chiraigaon", "Kashividyapith", "Harhua"] },
      { district: "Prayagraj", cities: ["Prayagraj", "Phulpur", "Soraon", "Naini", "Handia", "Karchana", "Koraon", "Meja", "Pratappur"] },
      { district: "Bareilly", cities: ["Bareilly", "Nawabganj", "Fatehganj West", "Baheri", "Aonla", "Richha", "Faridpur", "Meerganj", "Mirganj"] },
      { district: "Aligarh", cities: ["Aligarh", "Khair", "Atrauli", "Gabhana", "Iglas", "Sasni", "Jalali", "Chandaus", "Akrabad", "Dhanipur"] },
      { district: "Moradabad", cities: ["Moradabad", "Sambhal", "Chandausi", "Thakurdwara", "Bilari", "Kundarki", "Asmauli", "Dilari", "Chhajlet"] },
      { district: "Saharanpur", cities: ["Saharanpur", "Deoband", "Roorkee", "Nakur", "Behat", "Gangoh", "Sarsawa", "Rampur Maniharan"] },
      { district: "Gorakhpur", cities: ["Gorakhpur", "Gola Bazar", "Chauri Chaura", "Pipraich", "Sahjanwa", "Khajni", "Campierganj", "Bansgaon", "Uruwa Bazar"] },
      { district: "Gautam Buddha Nagar", cities: ["Noida", "Greater Noida", "Dadri", "Jewar", "Dankaur", "Bisrakh", "Surajpur", "Ecotech", "Knowledge Park"] },
      { district: "Jhansi", cities: ["Jhansi", "Moth", "Babina", "Mauranipur", "Garautha", "Chirgaon", "Samthar", "Bangra"] },
      { district: "Muzaffarnagar", cities: ["Muzaffarnagar", "Shamli", "Kairana", "Jansath", "Budhana", "Charthawal", "Kandhla", "Un", "Baghra"] },
      { district: "Mathura", cities: ["Mathura", "Vrindavan", "Govardhan", "Barsana", "Chhata", "Mant", "Baldeo", "Raya", "Nandgaon"] },
      { district: "Rampur", cities: ["Rampur", "Bilaspur", "Swar", "Milak", "Shahabad", "Tanda", "Chamraua", "Patwapur"] },
      { district: "Shahjahanpur", cities: ["Shahjahanpur", "Tilhar", "Powayan", "Jalalabad", "Katra", "Khutar", "Nigohi", "Banda", "Khudaganj"] },
      { district: "Farrukhabad", cities: ["Farrukhabad", "Fatehgarh", "Kaimganj", "Mohammadabad", "Nawabganj", "Shamshabad", "Bhojpur", "Amritpur"] },
      { district: "Mau", cities: ["Mau", "Ghosi", "Mohammadabad", "Kopaganj", "Madhuban", "Pardaha", "Ranipur", "Fatehpur Mandwa"] },
      { district: "Hapur", cities: ["Hapur", "Garhmukteshwar", "Pilkhuwa", "Simbhaoli", "Dhaulana", "Babugarh"] },
      { district: "Etawah", cities: ["Etawah", "Auraiya", "Jaswantnagar", "Bharthana", "Saifai", "Chakarnagar", "Bakewar", "Basrehar"] },
      { district: "Mirzapur", cities: ["Mirzapur", "Vindham", "Chunar", "Marihan", "Ahraura", "Lalganj", "Madihan", "Jamalpur", "Hallia"] },
      { district: "Bulandshahr", cities: ["Bulandshahr", "Khurja", "Sikandrabad", "Jahangirabad", "Gulaothi", "Shikarpur", "Dibai", "Anupshahar", "Syana"] },
      { district: "Amroha", cities: ["Amroha", "Gajraula", "Hasanpur", "Dhanaura", "Naugawan Sadat", "Gangeshwari"] },
      { district: "Fatehpur", cities: ["Fatehpur", "Bindki", "Khaga", "Amauli", "Malwan", "Haswa", "Vikrampur", "Dhata"] },
      { district: "Rae Bareli", cities: ["Rae Bareli", "Lalganj", "Salon", "Unchahar", "Kunda", "Maharajganj", "Parsadepur", "Bachrawan"] },
      { district: "Unnao", cities: ["Unnao", "Shuklaganj", "Hasanganj", "Purwa", "Bangarmau", "Safipur", "Nawabganj", "Ganj Moradabad", "Miyaganj"] },
      { district: "Jaunpur", cities: ["Jaunpur", "Machhali Shahar", "Mariahu", "Shahganj", "Kerakat", "Baksha", "Badlapur", "Sujanganj", "Mungra Badshahpur"] },
      { district: "Lakhimpur Kheri", cities: ["Lakhimpur Kheri", "Gola Gokaran Nath", "Pallia Kalan", "Nighasan", "Dhaurahra", "Bijua", "Tikonia", "Behjam"] },
      { district: "Sitapur", cities: ["Sitapur", "Biswan", "Laharpur", "Mahmudabad", "Misrikh", "Sidhauli", "Tambaur", "Reusa", "Rampur Mathura"] },
      { district: "Hardoi", cities: ["Hardoi", "Sandila", "Bilgram", "Pihani", "Shahabad", "Sandi", "Kachhauna", "Mallawan", "Sursa"] },
      { district: "Sultanpur", cities: ["Sultanpur", "Amethi", "Musafirkhana", "Kadipur", "Gauriganj", "Dostpur", "Lambhua", "Kurebhar", "Mohammadpur"] },
      { district: "Ayodhya", cities: ["Ayodhya", "Faizabad", "Tanda", "Rudauli", "Bikapur", "Akbarpur", "Goshainganj", "Inayatganj", "Mavai"] },
      { district: "Banda", cities: ["Banda", "Atarra", "Baberu", "Naraini", "Tindwari", "Bisanda", "Kamasin", "Mahuva"] },
      { district: "Deoria", cities: ["Deoria", "Barhaj", "Salempur", "Bhatpar Rani", "Lar", "Rudrapur", "Gauri Bazar", "Pathardeva"] },
      { district: "Gonda", cities: ["Gonda", "Nawabganj", "Colonelganj", "Mankapur", "Katra Bazar", "Tarabganj", "Haldharmau", "Paraspur"] },
      { district: "Ballia", cities: ["Ballia", "Rasra", "Bairia", "Sikandarpur", "Bansdih", "Reoti", "Nagra", "Belthara Road", "Ubhaon"] },
      { district: "Azamgarh", cities: ["Azamgarh", "Phulpur", "Sagri", "Lalganj", "Mehnagar", "Koilsa", "Jahanaganj", "Tahbarpur", "Nizamabad"] },
      { district: "Basti", cities: ["Basti", "Khalilabad", "Haraiya", "Gaur", "Kudarha", "Bhanpur", "Ramnagar", "Dubauliya", "Walterganj"] },
      { district: "Bhadohi", cities: ["Bhadohi", "Gyanpur", "Aurai", "Suriyawan", "Digh", "Gopiganj", "Chauri"] },
      { district: "Ghazipur", cities: ["Ghazipur", "Muhammadabad", "Saidpur", "Zamania", "Bhadaura", "Karanda", "Birno", "Yusufpur"] },
      { district: "Pratapgarh", cities: ["Pratapgarh", "Kunda", "Patti", "Raniganj", "Sangipur", "Babaganj", "Lalganj Ajhara", "Manikpur"] },
      { district: "Barabanki", cities: ["Barabanki", "Fatehpur", "Nawabganj", "Haidergarh", "Deva", "Zaidpur", "Kursi", "Trivediganj", "Sirauli Gauspur"] },
      { district: "Pilibhit", cities: ["Pilibhit", "Puranpur", "Bisalpur", "Barkhera", "Kalinagar", "Marori", "Bilsanda", "Sungarhi"] },
      { district: "Bijnor", cities: ["Bijnor", "Najibabad", "Nagina", "Dhampur", "Chandpur", "Seohara", "Kiratpur", "Noorpur", "Mandawar"] },
      { district: "Shamli", cities: ["Shamli", "Kairana", "Un", "Thanabhawan", "Jhinjhana", "Kandhla"] },
      { district: "Baghpat", cities: ["Baghpat", "Baraut", "Khekra", "Chaprauli", "Pilana", "Binauli", "Chhaprauli", "Tikri"] },
      { district: "Firozabad", cities: ["Firozabad", "Shikohabad", "Tundla", "Jasrana", "Sirsaganj", "Madanpur", "Eka", "Narkhi"] },
      { district: "Mainpuri", cities: ["Mainpuri", "Bhongaon", "Karhal", "Kishni", "Kurawali", "Sultanpur", "Bewar", "Kuraoli"] },
      { district: "Etah", cities: ["Etah", "Aliganj", "Kasganj", "Jalesar", "Patiali", "Marehra", "Awagarh", "Soron", "Nidhauli Kalan"] },
      { district: "Hathras", cities: ["Hathras", "Sadabad", "Sikandra Rao", "Sasni", "Mursan", "Hathras Junction", "Iglas"] },
      { district: "Sambhal", cities: ["Sambhal", "Chandausi", "Bahjoi", "Gunnaur", "Asmoli", "Rajpura", "Panwasa"] },
      { district: "Chandauli", cities: ["Chandauli", "Mughalsarai", "Sakaldiha", "Chakia", "Naugarh", "Shahabganj", "Dhanapur"] },
      { district: "Sonbhadra", cities: ["Robertsganj", "Obra", "Chopan", "Duddhi", "Ghorawal", "Myorpur", "Anpara"] },
      { district: "Sant Kabir Nagar", cities: ["Khalilabad", "Mehdawal", "Baghauli", "Hainsar Bazar", "Maghar", "Menhdawal", "Santha"] },
      { district: "Maharajganj", cities: ["Maharajganj", "Nichlaul", "Pharenda", "Nautanwa", "Siswa Bazar", "Anandnagar", "Bridgemanganj"] },
      { district: "Kushinagar", cities: ["Kushinagar", "Padrauna", "Kasia", "Hata", "Ramkola", "Dudahi", "Seorahi", "Tamkuhi Raj"] },
      { district: "Siddharthnagar", cities: ["Naugarh", "Barhni", "Bansi", "Domariaganj", "Itwa", "Shohratgarh", "Khuniaon", "Lotan"] },
      { district: "Bahraich", cities: ["Bahraich", "Nanpara", "Kaiserganj", "Risia", "Jarwal", "Mahsi", "Fakharpur", "Shivpur", "Balha"] },
      { district: "Shravasti", cities: ["Bhinga", "Ikauna", "Jamunaha", "Sirsiya", "Patna Sadar", "Gilaula"] },
      { district: "Balrampur", cities: ["Balrampur", "Utraula", "Tulsipur", "Pachperwa", "Harraiya", "Gaindas Bujurg", "Rehna Bazar"] },
      { district: "Ambedkar Nagar", cities: ["Akbarpur", "Tanda", "Alapur", "Bhiti", "Jalalpur", "Katehari", "Bhiyawan"] },
      { district: "Amethi", cities: ["Gauriganj", "Amethi", "Musafirkhana", "Tiloi", "Shukul Bazar", "Jagdishpur", "Shahgarh", "Sangrampur"] },
      { district: "Chitrakoot", cities: ["Karwi", "Mau", "Rajapur", "Manikpur", "Markundi", "Sitapur"] },
      { district: "Kaushambi", cities: ["Manjhanpur", "Sirathu", "Chail", "Nevdhia", "Karari", "Kaushambi"] },
      { district: "Hamirpur", cities: ["Hamirpur", "Maudaha", "Rath", "Sarila", "Gohand", "Kurara", "Bharua Sumerpur"] },
      { district: "Mahoba", cities: ["Mahoba", "Kulpahar", "Charkhari", "Kabrai", "Panwari", "Jaitpur"] },
      { district: "Lalitpur", cities: ["Lalitpur", "Talbehat", "Mehroni", "Pali", "Jakhaura", "Madawara", "Birdha", "Bar"] },
      { district: "Auraiya", cities: ["Auraiya", "Dibiyapur", "Achhalda", "Bidhuna", "Ajitmal", "Erwa Katra", "Phaphund"] },
      { district: "Kannauj", cities: ["Kannauj", "Chhibramau", "Gursahaiganj", "Tirwa", "Saurikh", "Jalalabad", "Haseran", "Talgram"] },
    ]
  },
  {
    state: "Uttarakhand",
    districts: [
      { district: "Dehradun", cities: ["Dehradun", "Mussoorie", "Rishikesh", "Doiwala", "Vikasnagar"] },
      { district: "Haridwar", cities: ["Haridwar", "Roorkee", "Jwalapur", "Laksar"] },
      { district: "Nainital", cities: ["Nainital", "Haldwani", "Ramnagar", "Bhimtal", "Kathgodam"] },
      { district: "Udham Singh Nagar", cities: ["Rudrapur", "Kashipur", "Kichha", "Sitarganj", "Bazpur"] },
      { district: "Almora", cities: ["Almora", "Ranikhet", "Bhikiyasain"] },
      { district: "Pithoragarh", cities: ["Pithoragarh", "Champawat"] },
      { district: "Pauri Garhwal", cities: ["Pauri", "Kotdwar", "Lansdowne", "Srinagar"] },
      { district: "Tehri Garhwal", cities: ["Tehri", "Chamba", "New Tehri"] },
      { district: "Chamoli", cities: ["Chamoli", "Joshimath", "Gopeshwar", "Badrinath"] },
      { district: "Uttarkashi", cities: ["Uttarkashi", "Gangotri", "Barkot"] },
      { district: "Rudraprayag", cities: ["Rudraprayag", "Kedarnath", "Agastmuni"] },
      { district: "Bageshwar", cities: ["Bageshwar", "Kanda"] },
      { district: "Champawat", cities: ["Champawat", "Tanakpur", "Lohaghat"] },
    ]
  },
  {
    state: "West Bengal",
    districts: [
      { district: "Kolkata", cities: ["Kolkata", "Park Street", "Salt Lake", "New Town"] },
      { district: "Howrah", cities: ["Howrah", "Uluberia", "Shibpur", "Bally"] },
      { district: "Paschim Bardhaman", cities: ["Durgapur", "Asansol", "Raniganj", "Kulti"] },
      { district: "North 24 Parganas", cities: ["Barasat", "Barrackpore", "Dum Dum", "Madhyamgram", "Habra", "Basirhat"] },
      { district: "South 24 Parganas", cities: ["Baruipur", "Diamond Harbour", "Kakdwip", "Falta", "Canning"] },
      { district: "Darjeeling", cities: ["Siliguri", "Darjeeling", "Kurseong", "Kalimpong"] },
      { district: "Nadia", cities: ["Krishnanagar", "Ranaghat", "Nabadwip", "Kalyani", "Santipur"] },
      { district: "Malda", cities: ["Malda", "English Bazar", "Old Malda"] },
      { district: "Purba Medinipur", cities: ["Haldia", "Tamluk", "Contai", "Digha"] },
      { district: "Paschim Medinipur", cities: ["Midnapore", "Kharagpur", "Jhargram"] },
      { district: "Hooghly", cities: ["Serampore", "Chinsurah", "Chandannagar", "Rishra", "Bhadreswar"] },
      { district: "Burdwan", cities: ["Bardhaman", "Kalna", "Katwa", "Memari"] },
      { district: "Murshidabad", cities: ["Berhampore", "Jangipur", "Kandi", "Lalbag"] },
      { district: "Birbhum", cities: ["Suri", "Bolpur", "Shantiniketan", "Rampurhat"] },
      { district: "Jalpaiguri", cities: ["Jalpaiguri", "Dhupguri", "Mal"] },
      { district: "Cooch Behar", cities: ["Cooch Behar", "Dinhata", "Mathabhanga"] },
      { district: "Alipurduar", cities: ["Alipurduar", "Falakata", "Cooch Behar"] },
      { district: "Uttar Dinajpur", cities: ["Raiganj", "Islampur", "Kaliaganj"] },
      { district: "Dakshin Dinajpur", cities: ["Balurghat", "Gangarampur", "Buniadpur"] },
      { district: "Purulia", cities: ["Purulia", "Raghunathpur", "Jhalda"] },
      { district: "Bankura", cities: ["Bankura", "Bishnupur", "Sonamukhi"] },
    ]
  },
  {
    state: "Delhi",
    districts: [
      { district: "Central Delhi", cities: ["Connaught Place", "Karol Bagh", "Paharganj", "Chandni Chowk"] },
      { district: "New Delhi", cities: ["New Delhi", "Chanakyapuri", "Lodhi Colony", "Jorbagh"] },
      { district: "South Delhi", cities: ["Saket", "Hauz Khas", "Defence Colony", "Greater Kailash", "Lajpat Nagar"] },
      { district: "South West Delhi", cities: ["Dwarka", "Vasant Kunj", "RK Puram", "Palam"] },
      { district: "North Delhi", cities: ["Model Town", "Civil Lines", "Kamla Nagar", "GTB Nagar"] },
      { district: "North West Delhi", cities: ["Rohini", "Pitampura", "Shalimar Bagh", "Wazirpur"] },
      { district: "West Delhi", cities: ["Janakpuri", "Rajouri Garden", "Tilak Nagar", "Punjabi Bagh"] },
      { district: "East Delhi", cities: ["Preet Vihar", "Laxmi Nagar", "Mayur Vihar", "Patparganj"] },
      { district: "North East Delhi", cities: ["Seelampur", "Jafrabad", "Maujpur", "Welcome"] },
      { district: "Shahdara", cities: ["Shahdara", "Dilshad Garden", "Vivek Vihar", "Anand Vihar"] },
      { district: "South East Delhi", cities: ["Nehru Place", "Kalkaji", "Okhla", "Govindpuri"] },
    ]
  },
  {
    state: "Jammu and Kashmir",
    districts: [
      { district: "Srinagar", cities: ["Srinagar", "Sonamarg", "Hazratbal"] },
      { district: "Jammu", cities: ["Jammu", "Katra", "Samba", "Akhnoor"] },
      { district: "Anantnag", cities: ["Anantnag", "Pahalgam", "Bijbehara"] },
      { district: "Baramulla", cities: ["Baramulla", "Sopore", "Uri", "Gulmarg"] },
      { district: "Pulwama", cities: ["Pulwama", "Shopian", "Pampore"] },
      { district: "Kupwara", cities: ["Kupwara", "Handwara", "Tangdhar"] },
      { district: "Budgam", cities: ["Budgam", "Magam", "Chadoora"] },
      { district: "Ganderbal", cities: ["Ganderbal", "Kangan", "Manasbal"] },
      { district: "Kulgam", cities: ["Kulgam", "Qazigund", "DH Pora"] },
      { district: "Bandipora", cities: ["Bandipora", "Gurez", "Sumbal"] },
      { district: "Udhampur", cities: ["Udhampur", "Ramnagar"] },
      { district: "Kathua", cities: ["Kathua", "Basohli", "Lakhanpur"] },
      { district: "Rajouri", cities: ["Rajouri", "Sunderbani", "Nowshera"] },
      { district: "Poonch", cities: ["Poonch", "Mendhar", "Surankote"] },
      { district: "Doda", cities: ["Doda", "Bhaderwah", "Gandoh"] },
      { district: "Ramban", cities: ["Ramban", "Banihal", "Batote"] },
      { district: "Kishtwar", cities: ["Kishtwar", "Paddar"] },
      { district: "Reasi", cities: ["Reasi", "Katra"] },
    ]
  },
  {
    state: "Ladakh",
    districts: [
      { district: "Leh", cities: ["Leh", "Nubra", "Diskit", "Pangong", "Hunder", "Thiksey", "Hemis"] },
      { district: "Kargil", cities: ["Kargil", "Drass", "Zanskar", "Padum", "Sankoo"] },
    ]
  },
  {
    state: "Chandigarh",
    districts: [
      { district: "Chandigarh", cities: ["Chandigarh", "Manimajra", "Mohali Border"] },
    ]
  },
  {
    state: "Puducherry",
    districts: [
      { district: "Puducherry", cities: ["Pondicherry", "Ozhukarai", "Villianur", "Ariyankuppam"] },
      { district: "Karaikal", cities: ["Karaikal", "Thirunallar"] },
      { district: "Mahe", cities: ["Mahe"] },
      { district: "Yanam", cities: ["Yanam"] },
    ]
  },
  {
    state: "Andaman and Nicobar Islands",
    districts: [
      { district: "South Andaman", cities: ["Port Blair", "Wandoor", "Chiriyatapu"] },
      { district: "North and Middle Andaman", cities: ["Mayabunder", "Diglipur", "Rangat", "Baratang"] },
      { district: "Nicobar", cities: ["Car Nicobar", "Great Nicobar", "Little Andaman"] },
    ]
  },
  {
    state: "Dadra and Nagar Haveli",
    districts: [
      { district: "Dadra and Nagar Haveli", cities: ["Silvassa", "Amli", "Naroli"] },
    ]
  },
  {
    state: "Daman and Diu",
    districts: [
      { district: "Daman", cities: ["Daman", "Nani Daman", "Moti Daman"] },
      { district: "Diu", cities: ["Diu"] },
    ]
  },
  {
    state: "Lakshadweep",
    districts: [
      { district: "Lakshadweep", cities: ["Kavaratti", "Agatti", "Minicoy", "Andrott", "Amini", "Kadmat", "Kalpeni"] },
    ]
  }
];

// Legacy format - flat list for backward compatibility
export const indianCitiesByState: CityGroup[] = indianStatesWithDistricts.map(state => ({
  state: state.state,
  cities: state.districts.flatMap(d => d.cities)
}));

// Flat list for backward compatibility
export const indianCities = indianCitiesByState.flatMap(group => 
  group.cities.map(city => `${city}, ${group.state}`)
);

// Popular/Metro cities for quick access
export const popularCities = [
  "Mumbai, Maharashtra",
  "Delhi, Delhi",
  "Bangalore, Karnataka",
  "Hyderabad, Telangana",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Pune, Maharashtra",
  "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan",
  "Lucknow, Uttar Pradesh",
  "Chandigarh, Chandigarh",
  "Kochi, Kerala"
];

export interface GroupedCitySuggestion {
  state: string;
  cities: string[];
}

// Get all states
export const getAllStates = (): string[] => {
  return indianStatesWithDistricts.map(s => s.state);
};

// Get districts for a state
export const getDistrictsForState = (state: string): string[] => {
  const stateData = indianStatesWithDistricts.find(s => s.state === state);
  return stateData ? stateData.districts.map(d => d.district) : [];
};

// Get cities for a district in a state
export const getCitiesForDistrict = (state: string, district: string): string[] => {
  const stateData = indianStatesWithDistricts.find(s => s.state === state);
  if (!stateData) return [];
  const districtData = stateData.districts.find(d => d.district === district);
  return districtData ? districtData.cities : [];
};

export const getFilteredCities = (query: string): string[] => {
  if (!query || query.length < 2) return [];
  
  const lowercaseQuery = query.toLowerCase();
  return indianCities
    .filter((city) => city.toLowerCase().includes(lowercaseQuery))
    .slice(0, 10);
};

export const getGroupedFilteredCities = (query: string): GroupedCitySuggestion[] => {
  if (!query || query.length < 2) return [];
  
  const lowercaseQuery = query.toLowerCase();
  const result: GroupedCitySuggestion[] = [];
  
  indianCitiesByState.forEach(group => {
    const matchingCities = group.cities.filter(city => 
      city.toLowerCase().includes(lowercaseQuery) || 
      group.state.toLowerCase().includes(lowercaseQuery)
    );
    
    if (matchingCities.length > 0) {
      result.push({
        state: group.state,
        cities: matchingCities.slice(0, 5) // Limit per state
      });
    }
  });
  
  return result.slice(0, 5); // Limit to 5 states
};

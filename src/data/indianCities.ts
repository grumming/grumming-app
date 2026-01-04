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
      { district: "Patna", cities: ["Patna", "Danapur", "Phulwari Sharif"] },
      { district: "Gaya", cities: ["Gaya", "Bodh Gaya", "Sherghati"] },
      { district: "Bhagalpur", cities: ["Bhagalpur", "Kahalgaon", "Sultanganj"] },
      { district: "Muzaffarpur", cities: ["Muzaffarpur", "Sitamarhi"] },
      { district: "Purnia", cities: ["Purnia", "Kishanganj", "Araria"] },
      { district: "Darbhanga", cities: ["Darbhanga", "Laheriasarai"] },
      { district: "Nalanda", cities: ["Bihar Sharif", "Rajgir"] },
      { district: "Bhojpur", cities: ["Arrah", "Jagdishpur"] },
      { district: "Begusarai", cities: ["Begusarai", "Barauni"] },
      { district: "Katihar", cities: ["Katihar", "Manihari"] },
      { district: "Munger", cities: ["Munger", "Jamalpur"] },
      { district: "Saran", cities: ["Chapra", "Sonpur"] },
      { district: "Saharsa", cities: ["Saharsa", "Simri Bakhtiyarpur"] },
      { district: "Rohtas", cities: ["Sasaram", "Dehri"] },
      { district: "Vaishali", cities: ["Hajipur", "Mahua"] },
      { district: "Siwan", cities: ["Siwan", "Maharajganj"] },
      { district: "West Champaran", cities: ["Bettiah", "Narkatiaganj"] },
      { district: "East Champaran", cities: ["Motihari", "Raxaul"] },
    ]
  },
  {
    state: "Chhattisgarh",
    districts: [
      { district: "Raipur", cities: ["Raipur", "Naya Raipur"] },
      { district: "Durg", cities: ["Bhilai", "Durg", "Rajnandgaon"] },
      { district: "Korba", cities: ["Korba", "Katghora"] },
      { district: "Bilaspur", cities: ["Bilaspur", "Ratanpur"] },
      { district: "Bastar", cities: ["Jagdalpur", "Kondagaon"] },
      { district: "Raigarh", cities: ["Raigarh", "Sarangarh"] },
      { district: "Surguja", cities: ["Ambikapur", "Surajpur"] },
      { district: "Koriya", cities: ["Baikunthpur", "Chirmiri"] },
      { district: "Dhamtari", cities: ["Dhamtari", "Kurud"] },
      { district: "Mahasamund", cities: ["Mahasamund", "Saraipali"] },
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
      { district: "Ahmedabad", cities: ["Ahmedabad", "Sanand", "Dholka"] },
      { district: "Surat", cities: ["Surat", "Bardoli", "Kamrej"] },
      { district: "Vadodara", cities: ["Vadodara", "Dabhoi", "Chhota Udepur"] },
      { district: "Rajkot", cities: ["Rajkot", "Gondal", "Jetpur", "Dhoraji"] },
      { district: "Bhavnagar", cities: ["Bhavnagar", "Mahuva", "Sihor"] },
      { district: "Jamnagar", cities: ["Jamnagar", "Dwarka", "Khambhalia"] },
      { district: "Junagadh", cities: ["Junagadh", "Veraval", "Mangrol"] },
      { district: "Gandhinagar", cities: ["Gandhinagar", "Kalol", "Mansa"] },
      { district: "Kutch", cities: ["Bhuj", "Gandhidham", "Mandvi", "Mundra", "Anjar"] },
      { district: "Anand", cities: ["Anand", "Petlad", "Khambhat"] },
      { district: "Morbi", cities: ["Morbi", "Wankaner", "Halvad"] },
      { district: "Mehsana", cities: ["Mehsana", "Visnagar", "Unjha", "Patan"] },
      { district: "Bharuch", cities: ["Bharuch", "Ankleshwar", "Dahej"] },
      { district: "Navsari", cities: ["Navsari", "Bilimora", "Gandevi"] },
      { district: "Valsad", cities: ["Valsad", "Vapi", "Dharampur"] },
      { district: "Porbandar", cities: ["Porbandar", "Ranavav"] },
      { district: "Panchmahal", cities: ["Godhra", "Halol", "Kalol"] },
      { district: "Banaskantha", cities: ["Palanpur", "Deesa", "Dhanera"] },
      { district: "Dahod", cities: ["Dahod", "Limkheda"] },
      { district: "Surendranagar", cities: ["Surendranagar", "Wadhwan", "Limbdi"] },
      { district: "Amreli", cities: ["Amreli", "Savarkundla", "Rajula"] },
      { district: "Sabarkantha", cities: ["Himmatnagar", "Modasa", "Idar"] },
      { district: "Kheda", cities: ["Nadiad", "Kapadvanj", "Thasra"] },
      { district: "Aravalli", cities: ["Modasa", "Bhiloda", "Malpur"] },
      { district: "Botad", cities: ["Botad", "Gadhada"] },
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
      { district: "Mumbai City", cities: ["Mumbai", "Colaba", "Fort", "Dadar"] },
      { district: "Mumbai Suburban", cities: ["Andheri", "Bandra", "Borivali", "Malad", "Kandivali", "Goregaon"] },
      { district: "Pune", cities: ["Pune", "Pimpri-Chinchwad", "Lonavala", "Khandala", "Talegaon"] },
      { district: "Nagpur", cities: ["Nagpur", "Kamptee", "Hingna"] },
      { district: "Thane", cities: ["Thane", "Kalyan", "Dombivli", "Bhiwandi", "Ulhasnagar", "Ambernath", "Badlapur"] },
      { district: "Nashik", cities: ["Nashik", "Malegaon", "Sinnar", "Trimbakeshwar"] },
      { district: "Aurangabad", cities: ["Aurangabad", "Khuldabad", "Ellora"] },
      { district: "Palghar", cities: ["Palghar", "Vasai", "Virar", "Dahanu", "Boisar"] },
      { district: "Raigad", cities: ["Panvel", "Alibag", "Pen", "Karjat", "Khopoli", "Uran"] },
      { district: "Solapur", cities: ["Solapur", "Barshi", "Pandharpur", "Akkalkot"] },
      { district: "Amravati", cities: ["Amravati", "Achalpur", "Paratwada"] },
      { district: "Nanded", cities: ["Nanded", "Deglur", "Bhokar"] },
      { district: "Kolhapur", cities: ["Kolhapur", "Ichalkaranji", "Jaysingpur", "Kagal"] },
      { district: "Akola", cities: ["Akola", "Murtijapur", "Akot"] },
      { district: "Sangli", cities: ["Sangli", "Miraj", "Vita", "Ashta"] },
      { district: "Jalgaon", cities: ["Jalgaon", "Bhusawal", "Amalner", "Chopda"] },
      { district: "Ahmednagar", cities: ["Ahmednagar", "Shrirampur", "Sangamner", "Shirdi"] },
      { district: "Latur", cities: ["Latur", "Udgir", "Ausa"] },
      { district: "Dhule", cities: ["Dhule", "Shirpur"] },
      { district: "Satara", cities: ["Satara", "Karad", "Mahabaleshwar", "Panchgani", "Wai"] },
      { district: "Chandrapur", cities: ["Chandrapur", "Ballarpur", "Warora"] },
      { district: "Parbhani", cities: ["Parbhani", "Jintur", "Pathri"] },
      { district: "Jalna", cities: ["Jalna", "Partur", "Ambad"] },
      { district: "Beed", cities: ["Beed", "Gevrai", "Ashti"] },
      { district: "Gondia", cities: ["Gondia", "Tirora", "Arjuni Morgaon"] },
      { district: "Wardha", cities: ["Wardha", "Hinganghat", "Arvi"] },
      { district: "Osmanabad", cities: ["Osmanabad", "Tuljapur", "Paranda"] },
      { district: "Yavatmal", cities: ["Yavatmal", "Pusad", "Wani"] },
      { district: "Washim", cities: ["Washim", "Malegaon", "Risod"] },
      { district: "Buldhana", cities: ["Buldhana", "Khamgaon", "Chikhli"] },
      { district: "Nandurbar", cities: ["Nandurbar", "Shahada", "Dhule"] },
      { district: "Ratnagiri", cities: ["Ratnagiri", "Chiplun", "Dapoli", "Guhagar"] },
      { district: "Sindhudurg", cities: ["Sindhudurg", "Sawantwadi", "Kudal", "Malvan"] },
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
      { district: "Lucknow", cities: ["Lucknow", "Mohanlalganj", "Kakori"] },
      { district: "Kanpur Nagar", cities: ["Kanpur", "Billhaur"] },
      { district: "Ghaziabad", cities: ["Ghaziabad", "Modinagar", "Murad Nagar", "Loni"] },
      { district: "Agra", cities: ["Agra", "Fatehpur Sikri", "Kheragarh"] },
      { district: "Meerut", cities: ["Meerut", "Modinagar", "Mawana", "Sardhana"] },
      { district: "Varanasi", cities: ["Varanasi", "Ramnagar", "Pindra"] },
      { district: "Prayagraj", cities: ["Prayagraj", "Phulpur", "Soraon"] },
      { district: "Bareilly", cities: ["Bareilly", "Nawabganj", "Fatehganj West"] },
      { district: "Aligarh", cities: ["Aligarh", "Khair", "Atrauli"] },
      { district: "Moradabad", cities: ["Moradabad", "Sambhal", "Chandausi"] },
      { district: "Saharanpur", cities: ["Saharanpur", "Deoband", "Roorkee"] },
      { district: "Gorakhpur", cities: ["Gorakhpur", "Gola Bazar", "Chauri Chaura"] },
      { district: "Gautam Buddha Nagar", cities: ["Noida", "Greater Noida", "Dadri", "Jewar"] },
      { district: "Jhansi", cities: ["Jhansi", "Moth", "Babina"] },
      { district: "Muzaffarnagar", cities: ["Muzaffarnagar", "Shamli", "Kairana"] },
      { district: "Mathura", cities: ["Mathura", "Vrindavan", "Govardhan", "Barsana"] },
      { district: "Rampur", cities: ["Rampur", "Bilaspur", "Swar"] },
      { district: "Shahjahanpur", cities: ["Shahjahanpur", "Tilhar", "Powayan"] },
      { district: "Farrukhabad", cities: ["Farrukhabad", "Fatehgarh", "Kaimganj"] },
      { district: "Mau", cities: ["Mau", "Ghosi", "Mohammadabad"] },
      { district: "Hapur", cities: ["Hapur", "Garhmukteshwar", "Pilkhuwa"] },
      { district: "Etawah", cities: ["Etawah", "Auraiya", "Jaswantnagar"] },
      { district: "Mirzapur", cities: ["Mirzapur", "Vindham", "Chunar"] },
      { district: "Bulandshahr", cities: ["Bulandshahr", "Khurja", "Sikandrabad"] },
      { district: "Amroha", cities: ["Amroha", "Gajraula"] },
      { district: "Fatehpur", cities: ["Fatehpur", "Bindki", "Khaga"] },
      { district: "Rae Bareli", cities: ["Rae Bareli", "Lalganj", "Salon"] },
      { district: "Unnao", cities: ["Unnao", "Shuklaganj", "Hasanganj"] },
      { district: "Jaunpur", cities: ["Jaunpur", "Machhali Shahar", "Mariahu"] },
      { district: "Lakhimpur Kheri", cities: ["Lakhimpur Kheri", "Gola Gokaran Nath"] },
      { district: "Sitapur", cities: ["Sitapur", "Biswan", "Laharpur"] },
      { district: "Hardoi", cities: ["Hardoi", "Sandila", "Bilgram"] },
      { district: "Sultanpur", cities: ["Sultanpur", "Amethi", "Musafirkhana"] },
      { district: "Ayodhya", cities: ["Ayodhya", "Faizabad", "Tanda"] },
      { district: "Banda", cities: ["Banda", "Atarra", "Baberu"] },
      { district: "Deoria", cities: ["Deoria", "Barhaj", "Salempur"] },
      { district: "Gonda", cities: ["Gonda", "Nawabganj", "Colonelganj"] },
      { district: "Ballia", cities: ["Ballia", "Rasra", "Bairia"] },
      { district: "Azamgarh", cities: ["Azamgarh", "Phulpur", "Sagri"] },
      { district: "Basti", cities: ["Basti", "Khalilabad", "Haraiya"] },
      { district: "Bhadohi", cities: ["Bhadohi", "Gyanpur", "Aurai"] },
      { district: "Ghazipur", cities: ["Ghazipur", "Muhammadabad", "Saidpur"] },
      { district: "Pratapgarh", cities: ["Pratapgarh", "Kunda", "Patti"] },
      { district: "Barabanki", cities: ["Barabanki", "Fatehpur", "Nawabganj"] },
      { district: "Pilibhit", cities: ["Pilibhit", "Puranpur", "Bisalpur"] },
      { district: "Bijnor", cities: ["Bijnor", "Najibabad", "Nagina"] },
      { district: "Shamli", cities: ["Shamli", "Kairana", "Un"] },
      { district: "Baghpat", cities: ["Baghpat", "Baraut", "Khekra"] },
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

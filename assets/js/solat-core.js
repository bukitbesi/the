/* Waktu solat (prayer times) for Malaysia's 60 JAKIM zones. The timetable is JAKIM e-Solat's, stored per zone and year
   in /assets/solat/<year>/<ZONE>.json as minutes after midnight (Malaysia time, UTC+8):
   [imsak, subuh, syuruk, dhuha, zohor, asar, maghrib, isyak]. This file finds the day, the next prayer, the countdown
   and the zone nearest a GPS position (district centres and main towns). Verified 18 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-18', source: 'JAKIM e-Solat', zones: 60, defaultZone: 'WLY01' };
  var KEYS = ['imsak', 'subuh', 'syuruk', 'dhuha', 'zohor', 'asar', 'maghrib', 'isyak'];
  // The five obligatory prayers, by index in KEYS.
  var PRAYERS = [1, 4, 5, 6, 7];
  var NAMES = {
    ms: ['Imsak', 'Subuh', 'Syuruk', 'Dhuha', 'Zohor', 'Asar', 'Maghrib', 'Isyak'],
    en: ['Imsak', 'Subuh (Fajr)', 'Syuruk (sunrise)', 'Dhuha', 'Zohor (Dhuhr)', 'Asar (Asr)', 'Maghrib', 'Isyak (Isha)']
  };
  var STATES = { JHR: 'Johor', KDH: 'Kedah', KTN: 'Kelantan', MLK: 'Melaka', NGS: 'Negeri Sembilan', PHG: 'Pahang', PLS: 'Perlis',
    PNG: 'Pulau Pinang', PRK: 'Perak', SBH: 'Sabah', SGR: 'Selangor', SWK: 'Sarawak', TRG: 'Terengganu', WLY: 'Wilayah Persekutuan' };
  // [code, areas] exactly as JAKIM lists them (spelling tidied).
  var ZONES = [
    ['JHR01', 'Pulau Aur dan Pulau Pemanggil'], ['JHR02', 'Johor Bahru, Kota Tinggi, Mersing, Kulai'], ['JHR03', 'Kluang, Pontian'],
    ['JHR04', 'Batu Pahat, Muar, Segamat, Gemas Johor, Tangkak'],
    ['KDH01', 'Kota Setar, Kubang Pasu, Pokok Sena (Daerah Kecil)'], ['KDH02', 'Kuala Muda, Yan, Pendang'], ['KDH03', 'Padang Terap, Sik'],
    ['KDH04', 'Baling'], ['KDH05', 'Bandar Baharu, Kulim'], ['KDH06', 'Langkawi'], ['KDH07', 'Puncak Gunung Jerai'],
    ['KTN01', 'Bachok, Kota Bharu, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat, Kuala Krai, Mukim Chiku'],
    ['KTN02', 'Gua Musang (Daerah Galas dan Bertam), Jeli, Jajahan Kecil Lojing'],
    ['MLK01', 'Seluruh Negeri Melaka'],
    ['NGS01', 'Tampin, Jempol'], ['NGS02', 'Jelebu, Kuala Pilah, Rembau'], ['NGS03', 'Port Dickson, Seremban'],
    ['PHG01', 'Pulau Tioman'], ['PHG02', 'Kuantan, Pekan, Muadzam Shah'], ['PHG03', 'Jerantut, Temerloh, Maran, Bera, Chenor, Jengka'],
    ['PHG04', 'Bentong, Lipis, Raub'], ['PHG05', 'Genting Sempah, Janda Baik, Bukit Tinggi'],
    ['PHG06', 'Cameron Highlands, Genting Highlands, Bukit Fraser'], ['PHG07', 'Daerah Rompin (Mukim Rompin, Mukim Endau, Mukim Pontian)'],
    ['PLS01', 'Kangar, Padang Besar, Arau'], ['PNG01', 'Seluruh Negeri Pulau Pinang'],
    ['PRK01', 'Tapah, Slim River, Tanjung Malim'], ['PRK02', 'Kuala Kangsar, Sg. Siput, Ipoh, Batu Gajah, Kampar'],
    ['PRK03', 'Lenggong, Pengkalan Hulu, Grik'], ['PRK04', 'Temengor, Belum'],
    ['PRK05', 'Kg Gajah, Teluk Intan, Bagan Datuk, Seri Iskandar, Beruas, Parit, Lumut, Sitiawan, Pulau Pangkor'],
    ['PRK06', 'Selama, Taiping, Bagan Serai, Parit Buntar'], ['PRK07', 'Bukit Larut'],
    ['SBH01', 'Bahagian Sandakan (Timur), Bukit Garam, Semawang, Temanggong, Tambisan, Bandar Sandakan, Sukau'],
    ['SBH02', 'Beluran, Telupid, Pinangah, Terusan, Kuamut, Bahagian Sandakan (Barat)'],
    ['SBH03', 'Lahad Datu, Silabukan, Kunak, Sahabat, Semporna, Tungku, Bahagian Tawau (Timur)'],
    ['SBH04', 'Bandar Tawau, Balong, Merotai, Kalabakan, Bahagian Tawau (Barat)'],
    ['SBH05', 'Kudat, Kota Marudu, Pitas, Pulau Banggi, Bahagian Kudat'], ['SBH06', 'Gunung Kinabalu'],
    ['SBH07', 'Kota Kinabalu, Ranau, Kota Belud, Tuaran, Penampang, Papar, Putatan, Bahagian Pantai Barat'],
    ['SBH08', 'Pensiangan, Keningau, Tambunan, Nabawan, Bahagian Pedalaman (Atas)'],
    ['SBH09', 'Beaufort, Kuala Penyu, Sipitang, Tenom, Long Pasia, Membakut, Weston, Bahagian Pedalaman (Bawah)'],
    ['SGR01', 'Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam'], ['SGR02', 'Kuala Selangor, Sabak Bernam'],
    ['SGR03', 'Klang, Kuala Langat'],
    ['SWK01', 'Limbang, Lawas, Sundar, Trusan'], ['SWK02', 'Miri, Niah, Bekenu, Sibuti, Marudi'],
    ['SWK03', 'Pandan, Belaga, Suai, Tatau, Sebauh, Bintulu'], ['SWK04', 'Sibu, Mukah, Dalat, Song, Igan, Oya, Balingian, Kanowit, Kapit'],
    ['SWK05', 'Sarikei, Matu, Julau, Rajang, Daro, Bintangor, Belawai'],
    ['SWK06', 'Lubok Antu, Sri Aman, Roban, Debak, Kabong, Lingga, Engkelili, Betong, Spaoh, Pusa, Saratok'],
    ['SWK07', 'Serian, Simunjan, Samarahan, Sebuyau, Meludam'], ['SWK08', 'Kuching, Bau, Lundu, Sematan'], ['SWK09', 'Zon Khas (Kampung Patarikan)'],
    ['TRG01', 'Kuala Terengganu, Marang, Kuala Nerus'], ['TRG02', 'Besut, Setiu'], ['TRG03', 'Hulu Terengganu'], ['TRG04', 'Dungun, Kemaman'],
    ['WLY01', 'Kuala Lumpur, Putrajaya'], ['WLY02', 'Labuan']
  ];
  // District centres and main towns [lat, lon, zone, name] for "use my location". Nearest point, not exact boundaries,
  // so the page shows the place it matched. Mountain and island special zones are chosen by hand.
  var PLACES = [
    [2.453, 104.517, 'JHR01', 'Pulau Aur'], [2.58, 104.328, 'JHR01', 'Pulau Pemanggil'], [1.511, 103.78, 'JHR02', 'Johor Bahru'], [1.762, 103.95, 'JHR02', 'Kota Tinggi'],
    [1.683, 103.555, 'JHR02', 'Kulai'], [2.323, 103.713, 'JHR02', 'Mersing'], [2.066, 103.388, 'JHR03', 'Kluang'], [1.545, 103.4, 'JHR03', 'Pontian'],
    [1.931, 103.032, 'JHR04', 'Batu Pahat'], [2.125, 102.785, 'JHR04', 'Muar'], [2.485, 102.963, 'JHR04', 'Segamat'], [2.275, 102.639, 'JHR04', 'Tangkak'],
    [6.12, 100.369, 'KDH01', 'Kota Setar'], [6.356, 100.401, 'KDH01', 'Kubang Pasu'], [6.156, 100.527, 'KDH01', 'Pokok Sena'], [5.694, 100.512, 'KDH02', 'Kuala Muda'],
    [5.984, 100.549, 'KDH02', 'Pendang'], [5.862, 100.4, 'KDH02', 'Yan'], [6.265, 100.694, 'KDH03', 'Padang Terap'], [5.989, 100.853, 'KDH03', 'Sik'],
    [5.709, 100.866, 'KDH04', 'Baling'], [5.203, 100.614, 'KDH05', 'Bandar Baharu'], [5.399, 100.647, 'KDH05', 'Kulim'], [6.346, 99.791, 'KDH06', 'Langkawi'],
    [6.003, 102.376, 'KTN01', 'Bachok'], [6.049, 102.262, 'KTN01', 'Kota Bharu'], [5.419, 102.166, 'KTN01', 'Kuala Krai'], [5.75, 102.246, 'KTN01', 'Machang'],
    [6.001, 102.088, 'KTN01', 'Pasir Mas'], [5.841, 102.387, 'KTN01', 'Pasir Puteh'], [5.755, 102.033, 'KTN01', 'Tanah Merah'], [6.168, 102.165, 'KTN01', 'Tumpat'],
    [5.001, 102.06, 'KTN02', 'Gua Musang'], [5.584, 101.827, 'KTN02', 'Jeli'], [4.771, 101.6, 'KTN02', 'Lojing'], [2.384, 102.192, 'MLK01', 'Alor Gajah'],
    [2.298, 102.433, 'MLK01', 'Jasin'], [2.241, 102.254, 'MLK01', 'Melaka Tengah'], [2.856, 102.471, 'NGS01', 'Jempol'], [2.551, 102.458, 'NGS01', 'Tampin'],
    [3.042, 102.114, 'NGS02', 'Jelebu'], [2.728, 102.219, 'NGS02', 'Kuala Pilah'], [2.56, 102.098, 'NGS02', 'Rembau'], [2.541, 101.886, 'NGS03', 'Port Dickson'],
    [2.755, 101.918, 'NGS03', 'Seremban'], [2.788, 104.172, 'PHG01', 'Pulau Tioman'], [3.859, 103.092, 'PHG02', 'Kuantan'], [3.056, 103.083, 'PHG02', 'Muadzam Shah'],
    [3.339, 103.186, 'PHG02', 'Pekan'], [3.169, 102.558, 'PHG03', 'Bera'], [4.257, 102.551, 'PHG03', 'Jerantut'], [3.616, 102.668, 'PHG03', 'Maran'],
    [3.593, 102.265, 'PHG03', 'Temerloh'], [3.384, 102.014, 'PHG04', 'Bentong'], [4.35, 101.914, 'PHG04', 'Lipis'], [3.865, 101.832, 'PHG04', 'Raub'],
    [4.473, 101.477, 'PHG06', 'Cameron Highlands'], [2.807, 103.486, 'PHG07', 'Kuala Rompin'], [6.504, 100.241, 'PLS01', 'Perlis'], [5.357, 100.231, 'PNG01', 'Barat Daya'],
    [5.209, 100.479, 'PNG01', 'Seberang Perai Selatan'], [5.364, 100.46, 'PNG01', 'Seberang Perai Tengah'], [5.499, 100.444, 'PNG01', 'Seberang Perai Utara'], [5.407, 100.283, 'PNG01', 'Timur Laut'],
    [4.134, 101.321, 'PRK01', 'Batang Padang'], [3.855, 101.463, 'PRK01', 'Muallim'], [4.41, 101.203, 'PRK02', 'Kampar'], [4.571, 101.134, 'PRK02', 'Kinta'],
    [4.833, 101.094, 'PRK02', 'Kuala Kangsar'], [5.587, 100.984, 'PRK03', 'Belukar Samang'], [5.433, 101.145, 'PRK03', 'Gerik'], [5.339, 101.062, 'PRK03', 'Kenering'],
    [5.569, 101.132, 'PRK03', 'Kerunai'], [5.11, 101.118, 'PRK03', 'Lenggong'], [5.684, 101.035, 'PRK03', 'Pengkalan Hulu'], [5.784, 101.498, 'PRK04', 'Belum'],
    [5.448, 101.453, 'PRK04', 'Temengor'], [3.875, 100.959, 'PRK05', 'Bagan Datuk'], [4.003, 101.09, 'PRK05', 'Hilir Perak'], [4.326, 100.708, 'PRK05', 'Manjung'],
    [4.261, 100.913, 'PRK05', 'Perak Tengah'], [5.007, 100.563, 'PRK06', 'Kerian'], [4.799, 100.724, 'PRK06', 'Larut Dan Matang'], [5.218, 100.815, 'PRK06', 'Selama'],
    [5.767, 117.982, 'SBH01', 'Sandakan'], [6.198, 117.383, 'SBH02', 'Beluran'], [5.415, 118.046, 'SBH02', 'Kinabatangan'], [5.763, 117.141, 'SBH02', 'Telupid'],
    [5.112, 117.021, 'SBH02', 'Tongod'], [4.704, 118.056, 'SBH03', 'Kunak'], [5.1, 118.395, 'SBH03', 'Lahad Datu'], [4.487, 118.441, 'SBH03', 'Semporna'],
    [4.496, 117.44, 'SBH04', 'Kalabakan'], [4.431, 118.01, 'SBH04', 'Tawau'], [6.436, 116.795, 'SBH05', 'Kota Marudu'], [7.018, 116.961, 'SBH05', 'Kudat'],
    [6.721, 117.103, 'SBH05', 'Pitas'], [6.315, 116.503, 'SBH07', 'Kota Belud'], [6.007, 116.156, 'SBH07', 'Kota Kinabalu'], [5.626, 116.012, 'SBH07', 'Papar'],
    [5.845, 116.197, 'SBH07', 'Penampang'], [5.877, 116.059, 'SBH07', 'Putatan'], [5.918, 116.773, 'SBH07', 'Ranau'], [6.072, 116.32, 'SBH07', 'Tuaran'],
    [5.266, 116.26, 'SBH08', 'Keningau'], [4.609, 116.444, 'SBH08', 'Nabawan'], [5.675, 116.4, 'SBH08', 'Tambunan'], [5.317, 115.694, 'SBH09', 'Beaufort'],
    [5.443, 115.503, 'SBH09', 'Kuala Penyu'], [4.651, 115.697, 'SBH09', 'Sipitang'], [4.895, 115.935, 'SBH09', 'Tenom'], [3.284, 101.649, 'SGR01', 'Gombak'],
    [3.067, 101.85, 'SGR01', 'Hulu Langat'], [3.56, 101.58, 'SGR01', 'Hulu Selangor'], [3.097, 101.574, 'SGR01', 'Petaling'], [2.806, 101.685, 'SGR01', 'Sepang'],
    [3.395, 101.324, 'SGR02', 'Kuala Selangor'], [3.68, 101.09, 'SGR02', 'Sabak Bernam'], [3.035, 101.386, 'SGR03', 'Klang'], [2.831, 101.501, 'SGR03', 'Kuala Langat'],
    [4.523, 115.453, 'SWK01', 'Lawas'], [4.293, 115.113, 'SWK01', 'Limbang'], [3.577, 114.253, 'SWK02', 'Beluru'], [4.08, 114.555, 'SWK02', 'Marudi'],
    [3.662, 115.122, 'SWK02', 'Miri'], [3.735, 113.767, 'SWK02', 'Subis'], [3.355, 114.83, 'SWK02', 'Telang Usan'], [2.559, 114.269, 'SWK03', 'Belaga'],
    [3.305, 113.23, 'SWK03', 'Bintulu'], [3.099, 113.559, 'SWK03', 'Sebauh'], [2.644, 113.018, 'SWK03', 'Tatau'], [2.691, 111.989, 'SWK04', 'Dalat'],
    [1.951, 112.219, 'SWK04', 'Kanowit'], [2.18, 113.114, 'SWK04', 'Kapit'], [2.824, 112.354, 'SWK04', 'Mukah'], [2.451, 112.443, 'SWK04', 'Selangau'],
    [2.3, 111.879, 'SWK04', 'Sibu'], [1.763, 112.533, 'SWK04', 'Song'], [2.534, 111.418, 'SWK05', 'Daro'], [1.804, 111.938, 'SWK05', 'Julau'],
    [2.165, 111.641, 'SWK05', 'Maradong'], [2.647, 111.695, 'SWK05', 'Matu'], [1.79, 111.692, 'SWK05', 'Pakan'], [2.063, 111.45, 'SWK05', 'Sarikei'],
    [2.277, 111.306, 'SWK05', 'Tanjung Manis'], [1.509, 111.513, 'SWK06', 'Betong'], [1.884, 111.24, 'SWK06', 'Kabong'], [1.291, 111.866, 'SWK06', 'Lubok Antu'],
    [1.564, 111.149, 'SWK06', 'Pusa'], [1.753, 111.414, 'SWK06', 'Saratok'], [1.2, 111.3, 'SWK06', 'Sri Aman'], [1.539, 110.618, 'SWK07', 'Asajaya'],
    [1.45, 110.488, 'SWK07', 'Samarahan'], [1.109, 110.627, 'SWK07', 'Serian'], [1.316, 110.851, 'SWK07', 'Simunjan'], [1.017, 110.436, 'SWK07', 'Tebedu'],
    [1.383, 110.11, 'SWK08', 'Bau'], [1.451, 110.321, 'SWK08', 'Kuching'], [1.662, 109.85, 'SWK08', 'Lundu'], [5.405, 103.002, 'TRG01', 'Kuala Nerus'],
    [5.282, 103.08, 'TRG01', 'Kuala Terengganu'], [5.072, 103.209, 'TRG01', 'Marang'], [5.596, 102.522, 'TRG02', 'Besut'], [5.448, 102.79, 'TRG02', 'Setiu'],
    [5.05, 102.774, 'TRG03', 'Hulu Terengganu'], [4.676, 103.138, 'TRG04', 'Dungun'], [4.281, 103.226, 'TRG04', 'Kemaman'], [3.147, 101.689, 'WLY01', 'Kuala Lumpur'],
    [2.932, 101.69, 'WLY01', 'Putrajaya'], [5.308, 115.221, 'WLY02', 'Labuan'],
    // Main towns, so border towns such as Parit Buntar match their own zone.
    [5.125, 100.493, 'PRK06', 'Parit Buntar'], [5.01, 100.54, 'PRK06', 'Bagan Serai'], [4.851, 100.741, 'PRK06', 'Taiping'], [4.026, 101.019, 'PRK05', 'Teluk Intan'],
    [4.217, 100.7, 'PRK05', 'Sitiawan'], [4.233, 100.63, 'PRK05', 'Lumut'], [4.362, 100.982, 'PRK05', 'Seri Iskandar'], [4.597, 101.09, 'PRK02', 'Ipoh'],
    [4.77, 100.937, 'PRK02', 'Kuala Kangsar'], [4.308, 101.153, 'PRK02', 'Kampar'], [4.469, 101.041, 'PRK02', 'Batu Gajah'], [4.198, 101.261, 'PRK01', 'Tapah'],
    [3.685, 101.518, 'PRK01', 'Tanjung Malim'], [3.826, 101.403, 'PRK01', 'Slim River'], [5.441, 101.123, 'PRK03', 'Grik'], [5.647, 100.488, 'KDH02', 'Sungai Petani'],
    [5.365, 100.562, 'KDH05', 'Kulim'], [6.121, 100.367, 'KDH01', 'Alor Setar'], [6.441, 100.199, 'PLS01', 'Kangar'], [5.399, 100.364, 'PNG01', 'Butterworth'],
    [5.414, 100.329, 'PNG01', 'George Town'], [3.073, 101.519, 'SGR01', 'Shah Alam'], [3.107, 101.607, 'SGR01', 'Petaling Jaya'], [2.993, 101.787, 'SGR01', 'Kajang'],
    [3.321, 101.576, 'SGR01', 'Rawang'], [3.044, 101.445, 'SGR03', 'Klang'], [2.811, 101.503, 'SGR03', 'Banting'], [3.34, 101.25, 'SGR02', 'Kuala Selangor'],
    [2.726, 101.938, 'NGS03', 'Seremban'], [2.522, 101.796, 'NGS03', 'Port Dickson'], [2.815, 101.797, 'NGS03', 'Nilai'], [2.196, 102.248, 'MLK01', 'Melaka'],
    [2.044, 102.568, 'JHR04', 'Muar'], [1.854, 102.933, 'JHR04', 'Batu Pahat'], [2.515, 102.815, 'JHR04', 'Segamat'], [2.03, 103.318, 'JHR03', 'Kluang'],
    [1.487, 103.389, 'JHR03', 'Pontian'], [1.656, 103.6, 'JHR02', 'Kulai'], [3.808, 103.326, 'PHG02', 'Kuantan'], [3.493, 103.39, 'PHG02', 'Pekan'],
    [3.449, 102.418, 'PHG03', 'Temerloh'], [3.522, 101.909, 'PHG04', 'Bentong'], [3.793, 101.857, 'PHG04', 'Raub'], [6.125, 102.238, 'KTN01', 'Kota Bharu'],
    [5.33, 103.137, 'TRG01', 'Kuala Terengganu'], [4.233, 103.418, 'TRG04', 'Chukai'], [4.758, 103.416, 'TRG04', 'Dungun'], [5.98, 116.073, 'SBH07', 'Kota Kinabalu'],
    [5.839, 118.117, 'SBH01', 'Sandakan'], [4.244, 117.891, 'SBH04', 'Tawau'], [5.03, 118.34, 'SBH03', 'Lahad Datu'], [5.338, 116.16, 'SBH08', 'Keningau'],
    [6.883, 116.836, 'SBH05', 'Kudat'], [5.347, 115.746, 'SBH09', 'Beaufort'], [1.553, 110.359, 'SWK08', 'Kuching'], [4.4, 113.991, 'SWK02', 'Miri'],
    [2.3, 111.82, 'SWK04', 'Sibu'], [3.171, 113.042, 'SWK03', 'Bintulu'], [1.237, 111.462, 'SWK06', 'Sri Aman'], [2.125, 111.517, 'SWK05', 'Sarikei'],
    [4.75, 115.0, 'SWK01', 'Limbang'], [1.459, 110.493, 'SWK07', 'Kota Samarahan'], [5.283, 115.231, 'WLY02', 'Labuan'], [3.139, 101.687, 'WLY01', 'Kuala Lumpur'],
    [2.926, 101.696, 'WLY01', 'Putrajaya']
  ];
  var DAY = 86400000;

  function dayNumber(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY : NaN; }
  function isoDate(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  function addDays(iso, n) { return isoDate(dayNumber(iso) + n); }
  function daysInYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365; }
  function dayOfYear(iso) { return dayNumber(iso) - dayNumber(iso.slice(0, 4) + '-01-01'); }
  // Malaysia time (UTC+8, no daylight saving) for an instant: { iso, minute, second }.
  function myt(ms) {
    var d = new Date(ms + 8 * 3600000);
    return { iso: d.toISOString().slice(0, 10), minute: d.getUTCHours() * 60 + d.getUTCMinutes(), second: d.getUTCSeconds() };
  }

  function encodeYear(zone, year, times) { return JSON.stringify({ zone: zone, year: year, t: times }) + '\n'; }
  function decodeYear(text) { var o = typeof text === 'string' ? JSON.parse(text) : text; return o && o.t && o.t.length === daysInYear(o.year) ? o : null; }
  function day(data, iso) {
    if (!data || !iso || +iso.slice(0, 4) !== data.year) return null;
    return data.t[dayOfYear(iso)] || null;
  }
  function month(data, iso) {
    var out = [], first = iso.slice(0, 8) + '01';
    for (var d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) { var t = day(data, d); if (t) out.push([d, t]); }
    return out;
  }

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  // 12-hour "5:53 AM" or 24-hour "05:53".
  function time(min, h24) {
    if (h24) return hhmm(min);
    var h = Math.floor(min / 60), m = min % 60;
    return ((h + 11) % 12 + 1) + ':' + pad(m) + (h < 12 ? ' AM' : ' PM');
  }
  function duration(mins, lang) {
    var h = Math.floor(mins / 60), m = mins % 60, ms = lang === 'ms';
    if (!h) return m + ' min';
    return h + (ms ? ' j ' : ' h ') + m + ' min';
  }
  function name(i, lang) { return NAMES[lang === 'ms' ? 'ms' : 'en'][i]; }

  // The next of the five prayers after `minute` today; after Isyak it is tomorrow's Subuh (null if tomorrow is unknown).
  function next(today, tomorrow, minute) {
    for (var k = 0; k < PRAYERS.length; k++) {
      var i = PRAYERS[k];
      if (today && today[i] > minute) return { i: i, at: today[i], tomorrow: false, mins: today[i] - minute };
    }
    if (!tomorrow) return null;
    return { i: 1, at: tomorrow[1], tomorrow: true, mins: tomorrow[1] + 1440 - minute };
  }
  // The prayer whose time it is now: Subuh until syuruk, then none until Zohor, then each prayer until the next,
  // and Isyak until Subuh. Returns an index in KEYS, or -1 between syuruk and Zohor.
  function current(today, minute) {
    if (!today) return -1;
    if (minute < today[1]) return 7;
    if (minute < today[2]) return 1;
    if (minute < today[4]) return -1;
    for (var k = PRAYERS.length - 1; k >= 0; k--) if (minute >= today[PRAYERS[k]]) return PRAYERS[k];
    return -1;
  }

  function zone(code) {
    for (var i = 0; i < ZONES.length; i++) if (ZONES[i][0] === code) return { code: code, areas: ZONES[i][1], state: STATES[code.slice(0, 3)] };
    return null;
  }
  // Nearest district centre, by distance on the sphere; null when over 120 km from any (outside Malaysia).
  function nearest(lat, lon) {
    lat = Number(lat); lon = Number(lon);
    if (!isFinite(lat) || !isFinite(lon)) return null;
    var best = null, rad = Math.PI / 180;
    for (var i = 0; i < PLACES.length; i++) {
      var p = PLACES[i], x = (p[1] - lon) * Math.cos((p[0] + lat) / 2 * rad), y = p[0] - lat, d = Math.sqrt(x * x + y * y) * 111.2;
      if (!best || d < best.km) best = { zone: p[2], place: p[3], km: d };
    }
    return best && best.km <= 120 ? best : null;
  }

  // JAKIM's timetable has the odd typo: SBH08 on 3 April 2026 lists imsak as 15:20 (the Asar time), and WLY02 on
  // 20-25 May 2027 lists Maghrib as 06:28 instead of 18:28. Imsak after Subuh becomes 10 minutes before Subuh (JAKIM's
  // usual gap; Perlis sets imsak at Subuh and is kept), and a Zohor-to-Isyak time 12 hours early gets its 12 hours
  // back. Returns the notes; check ordered() afterwards.
  function tidy(t) {
    var notes = [];
    if (t[0] > t[1]) { notes.push('imsak ' + hhmm(t[0]) + ' → ' + hhmm(t[1] - 10)); t[0] = t[1] - 10; }
    for (var i = 4; i < 8; i++) if (t[i] <= t[i - 1] && t[i] + 720 > t[i - 1] && t[i] + 720 < 1440) { notes.push(KEYS[i] + ' ' + hhmm(t[i]) + ' → ' + hhmm(t[i] + 720)); t[i] += 720; }
    return notes;
  }
  function ordered(t) {
    for (var i = 1; i < 8; i++) if (t[i] < t[i - 1] || (i > 1 && t[i] === t[i - 1])) return false;
    return true;
  }

  var api = { FACTS: FACTS, KEYS: KEYS, PRAYERS: PRAYERS, NAMES: NAMES, STATES: STATES, ZONES: ZONES, PLACES: PLACES,
    dayNumber: dayNumber, isoDate: isoDate, addDays: addDays, daysInYear: daysInYear, dayOfYear: dayOfYear, myt: myt,
    encodeYear: encodeYear, decodeYear: decodeYear, day: day, month: month, hhmm: hhmm, time: time, duration: duration,
    name: name, next: next, current: current, zone: zone, nearest: nearest, tidy: tidy, ordered: ordered };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBSolat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

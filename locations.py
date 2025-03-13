import re


MOSCOW_DISTRICTS = [
    "Академический", "Алексеевский", "Алтуфьевский", "Арбат", "Аэропорт",
    "Бабушкинский", "Басманный", "Беговой", "Бескудниковский", "Бибирево",
    "Бирюлёво Восточное", "Бирюлёво Западное", "Богородское", "Братеево", "Бутово Северное",
    "Бутово Южное", "Бутырский", "Вешняки", "Внуково", "Войковский",
    "Восточное Дегунино", "Восточное Измайлово", "Восточный", "Выхино-Жулебино", "Гагаринский",
    "Головинский", "Гольяново", "Даниловский", "Дмитровский", "Донской",
    "Дорогомилово", "Замоскворечье", "Западное Дегунино", "Зюзино", "Зябликово",
    "Ивановское", "Измайлово", "Капотня", "Коньково", "Коптево",
    "Косино-Ухтомский", "Котловка", "Красносельский", "Крылатское", "Кузьминки",
    "Кунцево", "Куркино", "Левобережный", "Лефортово", "Лианозово",
    "Ломоносовский", "Лосиноостровский", "Люблино", "Марфино", "Марьина Роща",
    "Марьино", "Метрогородок", "Мещанский", "Митино", "Можайский",
    "Молжаниновский", "Москворечье-Сабурово", "Нагатино-Садовники", "Нагатинский Затон", "Нагорный",
    "Некрасовка", "Нижегородский", "Новогиреево", "Новокосино", "Ново-Переделкино",
    "Обручевский", "Орехово-Борисово Северное", "Орехово-Борисово Южное", "Останкинский", "Отрадное",
    "Очаково-Матвеевское", "Перово", "Печатники", "Покровское-Стрешнево", "Преображенское",
    "Пресненский", "Проспект Вернадского", "Раменки", "Ростокино", "Рязанский",
    "Савёловский", "Свиблово", "Северное Измайлово", "Северное Медведково", "Северное Тушино",
    "Северный", "Сокол", "Соколиная Гора", "Сокольники", "Солнцево",
    "Строгино", "Таганский", "Тверской", "Текстильщики", "Тёплый Стан",
    "Тимирязевский", "Тропарёво-Никулино", "Филёвский Парк", "Фили-Давыдково", "Хамовники",
    "Ховрино", "Хорошёво-Мнёвники", "Хорошёвский", "Царицыно", "Черёмушки",
    "Чертаново Северное", "Чертаново Центральное", "Чертаново Южное", "Щукино", "Южное Медведково",
    "Южное Тушино", "Южнопортовый", "Якиманка", "Ярославский", "Ясенево"
]


POPULAR_FOOTBALL_VENUES = [
    "Стадион Лужники", "Открытие Арена", "ВЭБ Арена", "РЖД Арена", "Стадион Динамо",
    "Спортивный комплекс ЦСКА", "Парк Горького", "Сокольники", "Измайловский парк", "Парк Победы",
    "Останкино", "Фили", "Крылатское", "Стадион Спартаковец", "Спортивный комплекс Олимпийский",
    "Петровский парк", "Черкизово", "Измайлово", "Сетунь", "Коломенское"
]


ALL_LOCATIONS = MOSCOW_DISTRICTS + POPULAR_FOOTBALL_VENUES

def normalize_text(text):
   
    if not text:
        return ""
    
    
    text = text.lower()
    
    
    text = text.replace('ё', 'е')
    

    text = ' '.join(text.split())
    
    return text

def search_locations(query):
    """
    Поиск локаций по запросу с улучшенным алгоритмом:
    - игнорирует разницу между 'е' и 'ё'
    - находит частичные совпадения
    - поддерживает опечатки (расстояние Левенштейна)
    
    Аргументы:
        query (str): Строка запроса
        
    Возвращает:
        list: Список локаций, соответствующих запросу
    """
    if not query:
        return []
    
  
    normalized_query = normalize_text(query)
    
 
    if len(normalized_query) < 2:
        results = []
        for location in ALL_LOCATIONS:
            normalized_location = normalize_text(location)
            words = normalized_location.split()
            for word in words:
                if word.startswith(normalized_query):
                    results.append(location)
                    break
        return results
    
   
    exact_matches = [] 
    word_starts = [] 
    contains = []      
    fuzzy_matches = [] 
    
    for location in ALL_LOCATIONS:
      
        normalized_location = normalize_text(location)
     
        if normalized_location == normalized_query:
            exact_matches.append(location)
            continue
            
      
        if normalized_location.startswith(normalized_query):
            exact_matches.append(location)
            continue
            
     
        words = normalized_location.split()
        word_start_match = False
        for word in words:
            if word.startswith(normalized_query):
                word_starts.append(location)
                word_start_match = True
                break
        if word_start_match:
            continue
            
      
        if normalized_query in normalized_location:
            contains.append(location)
            continue
            
    
        if len(normalized_query) >= 3:
 
            query_parts = [normalized_query[i:i+len(normalized_query)-1] for i in range(2)]
            for part in query_parts:
                if len(part) >= 2 and part in normalized_location:
                    fuzzy_matches.append(location)
                    break
    

    results = exact_matches + word_starts + contains + fuzzy_matches
    
    
    unique_results = []
    for item in results:
        if item not in unique_results:
            unique_results.append(item)
    
    return unique_results

def get_all_locations():
    """Возвращает полный список всех локаций"""
    return ALL_LOCATIONS

import re


MOSCOW_DISTRICTS = [
    "�������������", "������������", "������������", "�����", "��������",
    "������������", "���������", "�������", "���������������", "��������",
    "������� ���������", "������� ��������", "�����������", "��������", "������ ��������",
    "������ �����", "���������", "�������", "�������", "����������",
    "��������� ��������", "��������� ���������", "���������", "������-��������", "�����������",
    "�����������", "���������", "�����������", "�����������", "�������",
    "������������", "�������������", "�������� ��������", "������", "���������",
    "����������", "���������", "�������", "��������", "�������",
    "������-���������", "��������", "��������������", "����������", "���������",
    "�������", "�������", "������������", "���������", "���������",
    "�������������", "����������������", "�������", "�������", "������� ����",
    "�������", "������������", "���������", "������", "���������",
    "��������������", "�����������-��������", "��������-���������", "����������� �����", "��������",
    "����������", "�������������", "�����������", "����������", "����-�����������",
    "�����������", "�������-�������� ��������", "�������-�������� �����", "������������", "��������",
    "�������-�����������", "������", "���������", "����������-���������", "��������������",
    "�����������", "�������� �����������", "�������", "���������", "���������",
    "����������", "��������", "�������� ���������", "�������� ����������", "�������� ������",
    "��������", "�����", "��������� ����", "����������", "��������",
    "��������", "���������", "��������", "������������", "Ҹ���� ����",
    "�������������", "��������-��������", "�������� ����", "����-���������", "���������",
    "�������", "��������-��������", "�����������", "��������", "��������",
    "��������� ��������", "��������� �����������", "��������� �����", "������", "����� ����������",
    "����� ������", "������������", "��������", "�����������", "�������"
]


POPULAR_FOOTBALL_VENUES = [
    "������� �������", "�������� �����", "��� �����", "��� �����", "������� ������",
    "���������� �������� ����", "���� ��������", "����������", "������������ ����", "���� ������",
    "���������", "����", "����������", "������� �����������", "���������� �������� �����������",
    "���������� ����", "���������", "���������", "������", "�����������"
]


ALL_LOCATIONS = MOSCOW_DISTRICTS + POPULAR_FOOTBALL_VENUES

def normalize_text(text):
   
    if not text:
        return ""
    
    
    text = text.lower()
    
    
    text = text.replace('�', '�')
    

    text = ' '.join(text.split())
    
    return text
   
def search_locations(query):
    """
    ����� ������� �� ������� � ���������� ����������:
    - ���������� ������� ����� '�' � '�'
    - ������� ��������� ����������
    - ������������ �������� (���������� �����������)
    
    ���������:
        query (str): ������ �������
        
    ����������:
        list: ������ �������, ��������������� �������
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
    """���������� ������ ������ ���� �������"""
    return ALL_LOCATIONS

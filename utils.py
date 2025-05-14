import hashlib

def generate_cache_key(text):
    """
    為查詢文本生成一個緩存鍵
    """
    return hashlib.md5(text.encode('utf-8')).hexdigest()

def is_similar_query(query1, query2):
    """
    檢查兩個查詢是否相似
    簡單實現：比較兩個字符串的相似度
    使用 Levenshtein 距離的簡化版
    """
    # 移除額外空格並轉換為小寫以進行更好的比較
    q1 = ' '.join(query1.lower().split())
    q2 = ' '.join(query2.lower().split())
    
    # 如果兩個查詢完全相同，則肯定相似
    if q1 == q2:
        return True
    
    # 計算 Jaccard 相似度
    set1 = set(q1.split())
    set2 = set(q2.split())
    
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    if union == 0:
        return False
    
    similarity = intersection / union
    
    # 如果相似度高於閾值，認為查詢相似
    return similarity > 0.8

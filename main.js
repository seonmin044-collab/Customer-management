// 엔터 키 입력 처리
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('product-name');
    if (input) {
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchProduct();
            }
        });
    }
});

async function searchProduct() {
    const query = document.getElementById('product-name').value.trim();
    const productInfoDiv = document.getElementById('product-info');

    if (!query) {
        productInfoDiv.innerHTML = '<p style="color: red;">검색어를 입력해 주세요.</p>';
        return;
    }

    productInfoDiv.innerHTML = '<p>데이터를 불러오는 중...</p>';

    const sheetId = '12XqPpuZdn1fN_IDglhuJsPGqZMa6i1psELEgB5dekoo';
    const gid = '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    try {
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            if (response.status === 404 || response.type === 'opaque') {
                throw new Error('스프레드시트에 접근할 수 없습니다. [공유] 설정에서 "링크가 있는 모든 사용자에게 공개"로 되어 있는지 확인해 주세요.');
            }
            throw new Error(`데이터를 가져오지 못했습니다. (상태 코드: ${response.status})`);
        }

        const data = await response.text();
        
        if (data.includes('<!DOCTYPE html>')) {
            throw new Error('스프레드시트가 비공개 상태입니다. 구글 시트 우측 상단 [공유] 버튼을 눌러 "링크가 있는 모든 사용자"에게 보기 권한을 주세요.');
        }

        const rows = parseCSV(data);

        // 검색 로직: 상품명(4), 마스터코드(0), 상품바코드(1) 중 하나라도 일치하면 결과에 포함
        const results = rows.filter(row => {
            const masterCode = (row[0] || '').toLowerCase();
            const barcode = (row[1] || '').toLowerCase();
            const productName = (row[4] || '').toLowerCase();
            const searchTerm = query.toLowerCase();

            return productName.includes(searchTerm) || 
                   masterCode.includes(searchTerm) || 
                   barcode.includes(searchTerm);
        });

        if (results.length === 0) {
            productInfoDiv.innerHTML = `<p>'${query}'에 대한 검색 결과가 없습니다.</p>`;
        } else {
            let html = `<h3>검색 결과: ${results.length}건</h3>`;
            results.forEach(product => {
                const productName = product[4] || '상품명 없음';
                // 구글 이미지 검색 URL 생성 (tbm=isch는 이미지 검색 탭 의미)
                const googleImageSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(productName)}&tbm=isch`;

                html += `
                    <div class="product-card">
                        <div class="product-details">
                            <p><strong>상품명:</strong> ${productName}</p>
                            <p><strong>마스터코드:</strong> ${product[0] || '-'}</p>
                            <p><strong>상품 바코드:</strong> ${product[1] || '-'}</p>
                            <p><strong>온도대:</strong> ${product[2] || '-'}</p>
                            <p><strong>구분:</strong> ${product[3] || '-'}</p>
                        </div>
                        <div class="product-actions">
                            <a href="${googleImageSearchUrl}" target="_blank" class="image-search-btn">
                                🖼️ 이미지 검색
                            </a>
                        </div>
                    </div>
                    <hr>
                `;
            });
            productInfoDiv.innerHTML = html;
        }
    } catch (error) {
        console.error('Search Error:', error);
        productInfoDiv.innerHTML = `
            <div style="color: red; border: 1px solid red; padding: 10px; border-radius: 5px;">
                <p><strong>오류 발생:</strong> ${error.message}</p>
                <p style="font-size: 0.9em; color: #666;">※ "Failed to fetch" 오류는 보통 구글 시트가 비공개일 때 발생합니다.</p>
            </div>
        `;
    }
}

function parseCSV(data) {
    const rows = [];
    const lines = data.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => {
                return col.replace(/^"|"$/g, '').trim();
            });
            rows.push(columns);
        }
    }
    return rows;
}

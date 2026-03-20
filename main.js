// 엔터 키 입력 처리
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('product-name');
    input.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchProduct();
        }
    });
});

async function searchProduct() {
    const productName = document.getElementById('product-name').value.trim();
    const productInfoDiv = document.getElementById('product-info');

    if (!productName) {
        productInfoDiv.innerHTML = '<p style="color: red;">상품명을 입력해 주세요.</p>';
        return;
    }

    productInfoDiv.innerHTML = '<p>데이터를 불러오는 중...</p>';

    const sheetId = '12XqPpuZdn1fN_IDglhuJsPGqZMa6i1psELEgB5dekoo';
    const gid = '0';
    // export URL (CSV 형식)
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
        
        // HTML이 반환된 경우 (로그인 페이지 등) 처리
        if (data.includes('<!DOCTYPE html>')) {
            throw new Error('스프레드시트가 비공개 상태입니다. 구글 시트 우측 상단 [공유] 버튼을 눌러 "링크가 있는 모든 사용자"에게 보기 권한을 주세요.');
        }

        const rows = parseCSV(data);

        // A: 마스터코드(0), B: 상품바코드(1), C: 온도대(2), D: 1P/3P(3), E: 상품명(4)
        const results = rows.filter(row => {
            if (!row[4]) return false;
            // 대소문자 구분 없이 검색 (선택 사항)
            return row[4].toLowerCase().includes(productName.toLowerCase());
        });

        if (results.length === 0) {
            productInfoDiv.innerHTML = `<p>'${productName}'에 대한 검색 결과가 없습니다.</p>`;
        } else {
            let html = `<h3>검색 결과: ${results.length}건</h3>`;
            results.forEach(product => {
                html += `
                    <div class="product-card">
                        <p><strong>상품명:</strong> ${product[4] || '-'}</p>
                        <p><strong>마스터코드:</strong> ${product[0] || '-'}</p>
                        <p><strong>상품 바코드:</strong> ${product[1] || '-'}</p>
                        <p><strong>온도대:</strong> ${product[2] || '-'}</p>
                        <p><strong>구분:</strong> ${product[3] || '-'}</p>
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
    
    // 첫 번째 줄은 헤더이므로 i=1부터 시작
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            // CSV의 쉼표와 따옴표를 제대로 처리하기 위한 정규식
            const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => {
                return col.replace(/^"|"$/g, '').trim();
            });
            rows.push(columns);
        }
    }
    return rows;
}

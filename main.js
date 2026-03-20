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

    // 사진 검색 input 이벤트 리스너 추가
    const imageInput = document.getElementById('image-upload');
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const loadingMsg = document.getElementById('image-loading-msg');
                if (loadingMsg) loadingMsg.style.display = 'block';
                
                // 폼 수동 제출
                document.getElementById('google-image-search-form').submit();
                
                // 전송 후 안내 문구 변경
                setTimeout(() => {
                    if (loadingMsg) loadingMsg.innerText = '구글 검색 결과창이 열렸습니다. (새 창 확인)';
                }, 2000);
            }
        });
    }
});

function triggerImageSearch() {
    document.getElementById('image-upload').click();
}

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
        if (!response.ok) throw new Error('데이터 접근 실패');

        const data = await response.text();
        if (data.includes('<!DOCTYPE html>')) throw new Error('시트 비공개 상태');

        const rows = parseCSV(data);
        const results = rows.filter(row => {
            const masterCode = (row[0] || '').toLowerCase();
            const barcode = (row[1] || '').toLowerCase();
            const productName = (row[4] || '').toLowerCase();
            const searchTerm = query.toLowerCase();
            return productName.includes(searchTerm) || masterCode.includes(searchTerm) || barcode.includes(searchTerm);
        });

        if (results.length === 0) {
            productInfoDiv.innerHTML = `<p>'${query}'에 대한 결과가 없습니다.</p>`;
        } else {
            let html = `<h3>검색 결과: ${results.length}건</h3>`;
            results.forEach(product => {
                const name = product[4] || '-';
                const googleImageSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(name)}&tbm=isch`;
                html += `
                    <div class="product-card">
                        <div class="product-details">
                            <p><strong>상품명:</strong> ${name}</p>
                            <p><strong>마스터코드:</strong> ${product[0] || '-'}</p>
                            <p><strong>상품 바코드:</strong> ${product[1] || '-'}</p>
                            <p><strong>온도대:</strong> ${product[2] || '-'}</p>
                            <p><strong>구분:</strong> ${product[3] || '-'}</p>
                        </div>
                        <div class="product-actions">
                            <a href="${googleImageSearchUrl}" target="_blank" class="image-search-btn">🖼️ 이미지 검색</a>
                        </div>
                    </div><hr>`;
            });
            productInfoDiv.innerHTML = html;
        }
    } catch (error) {
        console.error(error);
        productInfoDiv.innerHTML = '<p style="color: red;">검색 중 오류가 발생했습니다. 구글 시트 공유 설정을 확인하세요.</p>';
    }
}

function parseCSV(data) {
    const rows = [];
    const lines = data.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
            rows.push(columns);
        }
    }
    return rows;
}

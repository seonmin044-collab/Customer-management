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
        if (!response.ok) throw new Error('데이터 접근 실패');

        const data = await response.text();
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
            results.forEach((product, index) => {
                const name = product[4] || '-';
                const barcodeNum = product[1] || '';
                const googleImageSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(name)}&tbm=isch`;
                
                html += `
                    <div class="product-card">
                        <div class="product-details">
                            <p><strong>상품명:</strong> ${name}</p>
                            <p><strong>마스터코드:</strong> ${product[0] || '-'}</p>
                            <p><strong>상품 바코드:</strong> ${barcodeNum || '-'}</p>
                            <p><strong>온도대:</strong> ${product[2] || '-'}</p>
                            <p><strong>구분:</strong> ${product[3] || '-'}</p>
                        </div>
                        <div class="product-actions">
                            <a href="${googleImageSearchUrl}" target="_blank" class="image-search-btn">🖼️ 이미지 검색</a>
                            <button onclick="openBarcode('${barcodeNum}')" class="barcode-view-btn">🏷️ 상품 바코드</button>
                        </div>
                    </div><hr>`;
            });
            productInfoDiv.innerHTML = html;
        }
    } catch (error) {
        console.error(error);
        productInfoDiv.innerHTML = '<p style="color: red;">오류 발생. 구글 시트 공유 설정을 확인하세요.</p>';
    }
}

// 바코드 모달 열기 함수
function openBarcode(barcodeNum) {
    if (!barcodeNum || barcodeNum === '-') {
        alert('바코드 정보가 없습니다.');
        return;
    }
    const modal = document.getElementById('barcode-modal');
    const modalImg = document.getElementById('modal-barcode-img');
    
    // bwip-js API를 통한 바코드 생성 URL
    const barcodeImgUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeNum)}&scale=3&rotate=N&includetext`;
    
    modalImg.src = barcodeImgUrl;
    modal.style.display = 'block';
    
    // 바디 스크롤 방지 (선택 사항)
    document.body.style.overflow = 'hidden';
}

// 바코드 모달 닫기 함수
function closeBarcode() {
    const modal = document.getElementById('barcode-modal');
    modal.style.display = 'none';
    
    // 바디 스크롤 복구
    document.body.style.overflow = 'auto';
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

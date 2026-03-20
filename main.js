async function searchProduct() {
    const productName = document.getElementById('product-name').value.trim();
    const productInfoDiv = document.getElementById('product-info');

    if (!productName) {
        productInfoDiv.innerHTML = '상품명을 입력해 주세요.';
        return;
    }

    productInfoDiv.innerHTML = '검색 중...';

    // 새로운 스프레드시트 ID 및 GID 설정
    const sheetId = '12XqPpuZdn1fN_IDglhuJsPGqZMa6i1psELEgB5dekoo';
    const gid = '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error('데이터를 가져오는 데 실패했습니다. 스프레드시트가 공개되어 있는지 확인해 주세요.');
        }
        const data = await response.text();
        const rows = parseCSV(data);

        // A: 마스터코드(0), B: 상품바코드(1), C: 온도대(2), D: 1P/3P(3), E: 상품명(4)
        // 상품명(Index 4)에 검색어가 포함된 모든 행을 필터링
        const results = rows.filter(row => row[4] && row[4].includes(productName));

        if (results.length === 0) {
            productInfoDiv.innerHTML = '검색 결과가 없습니다.';
        } else {
            let html = `<h3>검색 결과 (${results.length}건)</h3>`;
            results.forEach(product => {
                html += `
                    <div class="product-card">
                        <p><strong>상품명:</strong> ${product[4]}</p>
                        <p><strong>마스터코드:</strong> ${product[0]}</p>
                        <p><strong>상품 바코드:</strong> ${product[1]}</p>
                        <p><strong>온도대:</strong> ${product[2]}</p>
                        <p><strong>구분:</strong> ${product[3]}</p>
                    </div>
                    <hr>
                `;
            });
            productInfoDiv.innerHTML = html;
        }
    } catch (error) {
        productInfoDiv.innerHTML = `오류 발생: ${error.message}`;
    }
}

function parseCSV(data) {
    const rows = [];
    // 줄바꿈 처리 (CRLF 대응)
    const lines = data.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) { // 헤더 제외
        const line = lines[i].trim();
        if (line) {
            // 쉼표로 구분하되, 따옴표 내부에 쉼표가 있는 경우를 고려한 간단한 정규식
            const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
            rows.push(columns);
        }
    }
    return rows;
}

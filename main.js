async function searchProduct() {
    const productName = document.getElementById('product-name').value.trim();
    const productInfoDiv = document.getElementById('product-info');

    if (!productName) {
        productInfoDiv.innerHTML = '상품명을 입력해 주세요.';
        return;
    }

    productInfoDiv.innerHTML = '검색 중...';

    const sheetId = '1PsbVMUNapdWqVWv89WykRTS1PtPtPmrwz_wzvW_nVII';
    const gid = '2112826214';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error('데이터를 가져오는 데 실패했습니다. 스프레드시트가 공개되어 있는지 확인해 주세요.');
        }
        const data = await response.text();
        const rows = parseCSV(data);

        // A: 마스터코드 (0), B: 바코드 (1), E: 온도대 (4), F: 1P/3P (5), I: 상품명 (8)
        const results = rows.filter(row => row[8] && row[8].includes(productName));

        if (results.length === 0) {
            productInfoDiv.innerHTML = '검색 결과가 없습니다.';
        } else {
            let html = '<h3>검색 결과</h3>';
            results.forEach(product => {
                html += `
                    <div class="product-card">
                        <p><strong>상품명:</strong> ${product[8]}</p>
                        <p><strong>마스터코드:</strong> ${product[0]}</p>
                        <p><strong>상품 바코드:</strong> ${product[1]}</p>
                        <p><strong>상품 온도대:</strong> ${product[4]}</p>
                        <p><strong>구분:</strong> ${product[5]}</p>
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
    const lines = data.split('\n');
    for (let i = 1; i < lines.length; i++) { // 헤더 제외
        const line = lines[i].trim();
        if (line) {
            // 간단한 CSV 파싱 (쉼표 기준, 따옴표 처리 미포함)
            const columns = line.split(',').map(col => col.replace(/^"|"$/g, ''));
            rows.push(columns);
        }
    }
    return rows;
}

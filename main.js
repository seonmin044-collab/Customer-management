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

async function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const loadingMsg = document.getElementById('loading-msg');
        const productNameInput = document.getElementById('product-name');
        
        loadingMsg.style.display = 'block';
        loadingMsg.innerText = '사진을 분석하고 있습니다... (처음엔 시간이 조금 걸릴 수 있습니다)';
        
        try {
            // Tesseract.js를 사용하여 이미지에서 텍스트 추출 (한국어 + 영어)
            const result = await Tesseract.recognize(
                file,
                'kor+eng', 
                { 
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            loadingMsg.innerText = `글자를 읽는 중... ${(m.progress * 100).toFixed(0)}%`;
                        }
                    }
                }
            );

            const extractedText = result.data.text;
            console.log('Extracted Text:', extractedText);

            // 추출된 텍스트 정제 (특수문자 제거, 공백 정리 등)
            // 너무 긴 문장은 검색에 방해가 될 수 있으므로, 적절히 잘라서 사용자가 수정하게끔 유도
            const cleanText = extractedText.replace(/[\n\r]+/g, ' ').trim();
            
            // 간단하게 첫 20자 정도만 가져와서 검색창에 넣어주고 사용자가 수정하게 함
            // 또는 추출된 단어 중 가장 빈도수가 높거나 의미 있는 단어를 찾는 로직이 필요하지만,
            // 여기서는 일단 전체 텍스트를 검색창에 넣어주고 사용자가 불필요한 부분을 지우도록 안내하는 것이 현실적입니다.
            productNameInput.value = cleanText.substring(0, 50); // 너무 길면 50자까지만
            
            loadingMsg.innerText = '분석 완료! 검색어를 확인하고 수정해 주세요.';
            setTimeout(() => { loadingMsg.style.display = 'none'; }, 3000);
            
            alert(`사진에서 다음 글자를 찾았습니다:\n"${cleanText.substring(0, 100)}..."\n\n정확한 검색을 위해 검색창의 내용을 수정해 주세요.`);

        } catch (error) {
            console.error(error);
            loadingMsg.innerText = '사진 분석에 실패했습니다.';
            alert('사진을 읽을 수 없습니다. 더 선명한 사진을 사용해 보세요.');
        }
    }
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

        // 검색 로직
        const results = rows.filter(row => {
            const masterCode = (row[0] || '').toLowerCase();
            const barcode = (row[1] || '').toLowerCase();
            const productName = (row[4] || '').toLowerCase();
            const searchTerm = query.toLowerCase();

            // 검색어가 포함된 경우
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

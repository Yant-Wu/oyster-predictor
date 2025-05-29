document.addEventListener('DOMContentLoaded', () => {
    // DOM元素引用
    const oysterForm = document.getElementById('oysterForm');
    const predictButton = document.getElementById('predictButton');
    const resultOutput = document.getElementById('resultOutput');
    const oysterImageInput = document.getElementById('oysterImage');
    const imagePreview = document.getElementById('imagePreview');
    const formInputs = oysterForm.querySelectorAll('input[type="number"]');
    
    // 狀態管理
    const appState = {
        isLoading: false,
        formValid: false,
        lastPrediction: null
    };
    
    // 初始化表單驗證
    initFormValidation();
    
    // 圖像預覽功能
    oysterImageInput.addEventListener('change', handleImagePreview);
    
    // 預測按鈕點擊事件
    predictButton.addEventListener('click', async () => {
        if (appState.isLoading) return;
        
        // 觸發表單驗證，以防使用者直接點擊按鈕而未觸發輸入事件
        validateForm(); 
        if (!appState.formValid) {
            showError('請修正表單中的錯誤後再試。');
            // 強調第一個錯誤的輸入框
            const firstErrorInput = oysterForm.querySelector('input.error');
            if (firstErrorInput) {
                firstErrorInput.focus();
            }
            return;
        }
        
        try {
            await submitPrediction();
        } catch (error) {
            showError(`預測過程中出錯: ${error.message}`);
        }
    });
    
    // 表單輸入事件處理
    formInputs.forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('blur', formatInputValue);
    });
    
    // 初始化表單驗證
    function initFormValidation() {
        validateForm();
    }
    
    // 處理圖像預覽
    function handleImagePreview() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                fadeIn(imagePreview);
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
        }
    }
    
    // 表單驗證
    function validateForm() {
        let isValid = true;
        
        formInputs.forEach(input => {
            if (!input.value.trim() || isNaN(parseFloat(input.value))) {
                isValid = false;
                setInputError(input, '請輸入有效的數值');
            } else {
                clearInputError(input);
            }
        });
        
        appState.formValid = isValid;
        updateButtonState();
    }
    
    // 設置輸入框錯誤狀態
    function setInputError(input, message) {
        const formGroup = input.closest('.form-group');
        const errorElement = formGroup.querySelector('.error-message');
        
        input.classList.add('error');
        
        if (!errorElement) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.color = '#F56C6C';
            errorDiv.style.fontSize = '0.9em';
            errorDiv.style.marginTop = '5px';
            formGroup.appendChild(errorDiv);
        }
        
        formGroup.querySelector('.error-message').textContent = message;
    }
    
    // 清除輸入框錯誤狀態
    function clearInputError(input) {
        input.classList.remove('error');
        const formGroup = input.closest('.form-group');
        const errorElement = formGroup.querySelector('.error-message');
        
        if (errorElement) {
            formGroup.removeChild(errorElement);
        }
    }
    
    // 格式化輸入值
    function formatInputValue() {
        if (this.value && !isNaN(parseFloat(this.value))) {
            this.value = parseFloat(this.value).toFixed(2);
        }
    }
    
    // 更新按鈕狀態
    function updateButtonState() {
        if (appState.isLoading) {
            predictButton.disabled = true;
            predictButton.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 分析中...';
        } else {
            predictButton.disabled = !appState.formValid;
            predictButton.innerHTML = '<i class="fa fa-calculator mr-2"></i> 開始分析';
        }
    }
    
    // 提交預測請求
    async function submitPrediction() {
        if (!appState.formValid) return; // 再次檢查以防萬一
        
        // 獲取輸入值 - 確保 ID 與 HTML 中的 ID 一致
        // 在 app.py 中，我們使用的是 shell_length, shell_width, shell_height, total_weight
        const shell_length = parseFloat(document.getElementById('leftShellLength').value); // HTML ID 是 leftShellLength
        const shell_width = parseFloat(document.getElementById('shellWidth').value);
        const shell_height = parseFloat(document.getElementById('shellHeight').value);
        const total_weight = parseFloat(document.getElementById('totalWeight').value);
        const imageFile = oysterImageInput.files[0];
        
        // 準備表單數據
        const formData = new FormData();
        formData.append('shell_length', shell_length);
        formData.append('shell_width', shell_width);
        formData.append('shell_height', shell_height);
        formData.append('total_weight', total_weight);
        
        if (imageFile) {
            formData.append('oyster_image', imageFile); // 與 app.py 中的 request.files.get('oyster_image') 匹配
        }
        
        // 顯示加載狀態
        appState.isLoading = true;
        updateButtonState();
        showLoading();
        
        try {
            // 真實的API請求
            const response = await fetch('/api/predict', {
                method: 'POST',
                body: formData // FormData 會自動設定 Content-Type 為 multipart/form-data
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error', details: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.details || data.error);
            }

            // 保存最後一次預測結果
            appState.lastPrediction = data;
            
            // 顯示結果
            displayResults(data); // displayResults 需要根據新的 API 回應格式進行調整

        } catch (error) {
            console.error('API請求失敗:', error);
            showError(`API請求失敗: ${error.message}`);
        } finally {
            // 重置加載狀態
            appState.isLoading = false;
            updateButtonState();
        }
    }
    
    // 顯示加載狀態
    function showLoading() {
        resultOutput.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>正在進行複雜的分析，請稍候...</p>
            </div>
        `;
        
        // 添加加載動畫樣式
        const style = document.createElement('style');
        style.textContent = `
            .loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(22, 93, 255, 0.1);
                border-radius: 50%;
                border-top-color: var(--primary-color);
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 顯示結果
    function displayResults(data) {
        // API 回應格式已更改，現在是:
        // {
        //     'success': True,
        //     'predicted_meat_weight': round(predicted_meat_weight, 2),
        //     'model_used': model_used,
        //     'input_features': {
        //         'shell_length': shell_length,
        //         'shell_width': shell_width,
        //         'shell_height': shell_height,
        //         'total_weight': total_weight
        //     }
        // }

        if (!data || !data.success) {
            showError(data.error || '無法顯示預測結果。');
            return;
        }

        const { predicted_meat_weight, model_used, input_features } = data;
        const totalWeight = parseFloat(input_features.total_weight);
        const predictedMeatWeight = parseFloat(predicted_meat_weight);

        // 計算百分比顯示
        const meatPercentage = totalWeight > 0 ? ((predictedMeatWeight / totalWeight) * 100).toFixed(1) : 'N/A';
        
        // 準備HTML模板
        const resultHTML = `
            <div class="result-card fade-in">
                <div class="result-header">
                    <h3>預測結果</h3>
                    <span class="model-tag">${model_used || 'N/A'}</span>
                </div>
                
                <div class="prediction-value">
                    <span class="value">${predictedMeatWeight.toFixed(2)}</span>
                    <span class="unit">公克 (g)</span>
                </div>
                
                <div class="prediction-metrics">
                    <div class="metric-item">
                        <span class="metric-label">肉占比</span>
                        <span class="metric-value">${meatPercentage}%</span>
                    </div>
                    <!-- 如果 API 回應中沒有置信度，則可以移除或隱藏此部分 -->
                    <!-- <div class="metric-item">
                        <span class="metric-label">置信度</span>
                        <span class="metric-value">N/A</span> 
                    </div> -->
                </div>
                
                <hr class="divider">
                
                <div class="input-summary">
                    <h4>輸入數據摘要</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="item-label">殼長:</span>
                            <span class="item-value">${input_features.shell_length} mm</span>
                        </div>
                        <div class="summary-item">
                            <span class="item-label">殼寬:</span>
                            <span class="item-value">${input_features.shell_width} mm</span>
                        </div>
                        <div class="summary-item">
                            <span class="item-label">殼高:</span>
                            <span class="item-value">${input_features.shell_height} mm</span>
                        </div>
                        <div class="summary-item">
                            <span class="item-label">總重量:</span>
                            <span class="item-value">${input_features.total_weight} g</span>
                        </div>
                        <!-- 如果 API 回應中沒有計算面積和體積，則可以移除或隱藏 -->
                        <!-- <div class="summary-item">
                            <span class="item-label">計算面積:</span>
                            <span class="item-value">N/A cm²</span>
                        </div>
                        <div class="summary-item">
                            <span class="item-label">計算體積:</span>
                            <span class="item-value">N/A cm³</span>
                        </div> -->
                        <div class="summary-item">
                            <span class="item-label">提供圖像:</span>
                            <span class="item-value">${oysterImageInput.files[0] ? '是' : '否'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除舊的樣式（如果之前動態添加過）
        const oldStyles = document.querySelectorAll('style[data-dynamic-style="result"]');
        oldStyles.forEach(s => s.remove());

        // 添加結果樣式 (如果尚未在 CSS 文件中定義)
        // 考慮將這些樣式移至 style.css 以保持一致性
        const style = document.createElement('style');
        style.setAttribute('data-dynamic-style', 'result'); // 標記以便移除
        style.textContent = `
            .result-card {
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                padding: 20px;
                transition: all 0.3s ease;
            }
            
            .result-card:hover {
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
            }
            
            .result-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .model-tag {
                background-color: var(--primary-color);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.85em;
                font-weight: 500;
            }
            
            .prediction-value {
                text-align: center;
                margin: 20px 0;
            }
            
            .value {
                font-size: 2.5rem;
                font-weight: 700;
                color: var(--primary-color);
            }
            
            .unit {
                font-size: 1.2rem;
                color: var(--neutral-500);
                margin-left: 5px;
            }
            
            .prediction-metrics {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-bottom: 20px;
            }
            
            .metric-item {
                text-align: center;
            }
            
            .metric-label {
                font-size: 0.9em;
                color: var(--neutral-400);
            }
            
            .metric-value {
                display: block;
                font-size: 1.2em;
                font-weight: 600;
                color: var(--neutral-600);
            }
            
            .divider {
                border: 0;
                height: 1px;
                background-color: var(--neutral-200);
                margin: 20px 0;
            }
            
            .input-summary h4 {
                margin-bottom: 15px;
                color: var(--neutral-700);
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            
            .summary-item {
                display: flex;
                align-items: center;
            }
            
            .item-label {
                flex-basis: 40%;
                color: var(--neutral-500);
                font-size: 0.95em;
            }
            
            .item-value {
                flex-basis: 60%;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
        
        // 設置結果並添加淡入動畫
        resultOutput.innerHTML = resultHTML;
        const resultCard = resultOutput.querySelector('.result-card');
        if (resultCard) {
             // 強制重繪以觸發動畫
            void resultCard.offsetWidth; 
            resultCard.classList.add('visible'); // 假設 .fade-in.visible 控制動畫
        }
    }
    
    // 顯示錯誤信息
    function showError(message) {
        resultOutput.innerHTML = `
            <div class="error-message-container fade-in">
                <i class="fa fa-exclamation-circle error-icon"></i>
                <p>${message}</p>
            </div>
        `;
        // 移除舊的樣式
        const oldErrorStyles = document.querySelectorAll('style[data-dynamic-style="error"]');
        oldErrorStyles.forEach(s => s.remove());

        // 添加錯誤樣式 (如果尚未在 CSS 文件中定義)
        const style = document.createElement('style');
        style.setAttribute('data-dynamic-style', 'error');
        style.textContent = `
            .error-message-container {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #F56C6C;
                background-color: #FEF0F0;
                padding: 15px;
                border-radius: 8px;
            }
            
            .error-icon {
                font-size: 1.5em;
            }
        `;
        document.head.appendChild(style);

        const errorContainer = resultOutput.querySelector('.error-message-container');
        if (errorContainer) {
            void errorContainer.offsetWidth;
            errorContainer.classList.add('visible');
        }
    }
    
    // 淡入動畫 - 改為使用 CSS transition/animation
    // function fadeIn(element) { ... } // 此函數不再需要，改用 CSS class 控制

    // 在 CSS 中添加 (或確保已存在於 static/css/style.css):
    // .fade-in {
    //     opacity: 0;
    //     transition: opacity 0.5s ease-in-out;
    // }
    // .fade-in.visible {
    //     opacity: 1;
    // }

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
});
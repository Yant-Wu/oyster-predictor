from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
import subprocess # 匯入 subprocess 模組

app = Flask(__name__)
app.secret_key = 'a_fixed_secret_key_for_all_workers' # 修改此處，確保所有 Gunicorn worker 使用相同的金鑰
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///oyster_predictor.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 資料庫模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    predictions = db.relationship('PredictionHistory', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

class PredictionHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    # 輸入特徵 - 根據您的牡蠣預測器調整
    shell_length = db.Column(db.Float)
    shell_width = db.Column(db.Float)
    shell_height = db.Column(db.Float)
    total_weight = db.Column(db.Float)
    # 其他可能的欄位
    # shucked_weight = db.Column(db.Float)
    # viscera_weight = db.Column(db.Float)
    # sex = db.Column(db.String(10))
    # rings = db.Column(db.Integer)

    predicted_meat_weight = db.Column(db.Float, nullable=False)
    model_used = db.Column(db.String(100))
    image_filename = db.Column(db.String(200)) # 如果您處理圖片上傳
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f'<PredictionHistory {self.id} by User {self.user_id}>'

@app.route('/')
def index():
    if 'user_id' in session: # 改用 user_id
        return redirect(url_for('home'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        
        if not user:
            flash('沒有使用者', 'danger')
            return redirect(url_for('auth', form='login'))
        
        if not check_password_hash(user.password_hash, password):
            flash('錯誤的帳號或密碼', 'danger')
            return redirect(url_for('auth', form='login'))

        # 如果使用者存在且密碼正確
        session['user_id'] = user.id
        session['username'] = user.username # 也可以儲存 username 以方便顯示
        flash('登入成功！', 'success')
        return redirect(url_for('home'))
        
    return render_template('auth.html', form='login', active_page='auth')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        if password != confirm_password:
            flash('密碼不符！', 'danger')
            return redirect(url_for('auth', form='register'))

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('此使用者名稱已被註冊。', 'warning')
            return redirect(url_for('auth', form='register'))

        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password_hash=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        flash('註冊成功！請登入。', 'success')
        return redirect(url_for('auth', form='login'))
    return render_template('auth.html', form='register', active_page='auth')

@app.route('/auth')
def auth():
    form_type = request.args.get('form', 'login') # Default to login
    if 'user_id' in session:
        return redirect(url_for('home'))
    return render_template('auth.html', form=form_type, active_page='auth')

@app.route('/home')
def home():
    if 'user_id' not in session: # 改用 user_id
        flash('請先登入。', 'warning')
        return redirect(url_for('login'))
    return render_template('home.html', username=session.get('username'), active_page='home')

@app.route('/oyster-predictor', methods=['GET', 'POST'])
@app.route('/oyster-predictor/<int:prediction_id>', methods=['GET', 'POST'])
def oyster_predictor(prediction_id=None):
    if 'user_id' not in session:
        flash('請先登入以使用牡蠣預測功能。', 'warning')
        return redirect(url_for('login'))

    prediction_to_edit = None
    if prediction_id:
        prediction_to_edit = PredictionHistory.query.get_or_404(prediction_id)
        # 確保只有擁有者可以載入其數據進行編輯
        if prediction_to_edit.user_id != session['user_id']:
            flash('您沒有權限編輯此預測紀錄。', 'danger')
            return redirect(url_for('oyster_predictor')) # MODIFIED

    if request.method == 'POST':
        # 這部分處理的是「新預測」或「更新預測」的邏輯
        try:
            shell_length = float(request.form['shell_length'])
            shell_width = float(request.form['shell_width'])
            shell_height = float(request.form['shell_height'])
            total_weight = float(request.form['total_weight'])
            model_selected = request.form.get('model_to_use') # 從表單獲取選擇的模型

            # --- 實際的機器學習模型預測邏輯將在此處 ---
            if model_selected == "CNN":
                # 範例：CNN 模型的預測計算方式 (您可以替換為真實的 CNN 模型呼叫)
                predicted_meat_weight = (shell_length + shell_width + shell_height + total_weight) * 0.15 # CNN 模型的不同範例計算
                model_used_for_history = "CNN"
            else:
                # 預設或其他模型的預測計算方式
                predicted_meat_weight = (shell_length * shell_width * shell_height * total_weight * 0.001) + 5.0 # 預設範例計算
                model_used_for_history = model_selected if model_selected else "SimulatedModel_v1" # 如果沒有選擇，則使用預設值
            # --- 模型預測結束 ---

            if prediction_id and prediction_to_edit: # 如果是編輯模式
                prediction_to_edit.shell_length = shell_length
                prediction_to_edit.shell_width = shell_width
                prediction_to_edit.shell_height = shell_height
                prediction_to_edit.total_weight = total_weight
                prediction_to_edit.predicted_meat_weight = predicted_meat_weight
                prediction_to_edit.model_used = model_used_for_history # 更新為實際使用的模型
                prediction_to_edit.timestamp = datetime.utcnow() # 更新時間戳
                db.session.commit()
                flash('預測紀錄已成功更新！', 'success')
                return redirect(url_for('oyster_predictor'))
            else: # 新增預測模式
                new_prediction = PredictionHistory(
                    user_id=session['user_id'],
                    shell_length=shell_length,
                    shell_width=shell_width,
                    shell_height=shell_height,
                    total_weight=total_weight,
                    predicted_meat_weight=predicted_meat_weight,
                    model_used=model_used_for_history # 儲存實際使用的模型
                )
                db.session.add(new_prediction)
                db.session.commit()
                flash('新的預測已成功創建！', 'success') # MODIFIED (consistent message)
                return redirect(url_for('oyster_predictor')) # MODIFIED
        except Exception as e:
            db.session.rollback()
            flash(f'處理預測時發生錯誤：{str(e)}', 'danger')
            user_predictions = PredictionHistory.query.filter_by(user_id=session['user_id']).order_by(PredictionHistory.timestamp.desc()).all()
            return render_template('oyster_predictor.html', prediction_to_edit=prediction_to_edit, predictions=user_predictions, error=str(e), active_page='oyster_predictor')

    # GET 請求，或者 POST 請求失敗後重新渲染
    user_predictions = PredictionHistory.query.filter_by(user_id=session['user_id']).order_by(PredictionHistory.timestamp.desc()).all()

    return render_template('oyster_predictor.html', prediction_to_edit=prediction_to_edit, predictions=user_predictions, active_page='oyster_predictor')

@app.route('/api/predict', methods=['POST'])
def api_predict():
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 401

    try:
        data = request.form # 或者 request.json 如果您從 JS 發送 JSON
        
        # 從表單獲取輸入特徵 - 確保這些名稱與您的 HTML 表單欄位匹配
        shell_length = float(data.get('shell_length', 0))
        shell_width = float(data.get('shell_width', 0))
        shell_height = float(data.get('shell_height', 0))
        total_weight = float(data.get('total_weight', 0))
        # image_file = request.files.get('oyster_image') # 處理圖片上傳的部分之後加入

        # --- 實際的機器學習模型預測邏輯將在此處 ---
        # 目前，我們只模擬一個預測結果
        predicted_meat_weight = (shell_length * shell_width * shell_height * total_weight * 0.001) + 5.0 # 範例計算
        model_used = "SimulatedModel_v1"
        # --- 模型預測結束 ---

        # 儲存預測歷史
        new_prediction = PredictionHistory(
            user_id=session['user_id'],
            shell_length=shell_length,
            shell_width=shell_width,
            shell_height=shell_height,
            total_weight=total_weight,
            predicted_meat_weight=predicted_meat_weight,
            model_used=model_used
            # image_filename=saved_image_filename # 如果有圖片
        )
        db.session.add(new_prediction)
        db.session.commit()

        return jsonify({
            'success': True,
            'predicted_meat_weight': round(predicted_meat_weight, 2),
            'model_used': model_used,
            'input_features': {
                'shell_length': shell_length,
                'shell_width': shell_width,
                'shell_height': shell_height,
                'total_weight': total_weight
            }
        })
    except Exception as e:
        # 可以在這裡記錄錯誤 e
        return jsonify({'error': 'Prediction failed', 'details': str(e)}), 500

@app.route('/delete_prediction/<int:prediction_id>', methods=['POST'])
def delete_prediction(prediction_id):
    if 'user_id' not in session:
        flash('請先登入。', 'warning')
        return redirect(url_for('login'))

    prediction = PredictionHistory.query.get_or_404(prediction_id)

    if prediction.user_id != session['user_id']:
        flash('您沒有權限刪除此預測紀錄。', 'danger')
        return redirect(url_for('oyster_predictor')) # MODIFIED

    try:
        db.session.delete(prediction)
        db.session.commit()
        flash('預測紀錄已成功刪除！', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'刪除失敗：{str(e)}', 'danger')
    
    return redirect(url_for('oyster_predictor')) # MODIFIED

@app.route('/logout')
def logout():
    session.pop('user_id', None) # 改用 user_id
    session.pop('username', None)
    flash('您已成功登出。', 'info')
    return redirect(url_for('login'))

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # 在開發模式下建立資料庫表
    
    # 使用 Gunicorn 啟動應用程式
    # 確保 Gunicorn 已安裝: pip install gunicorn
    gunicorn_command = [
        'gunicorn',
        '--workers', '4',
        '--bind', '0.0.0.0:8000',
        'app:app'  # app:app 指的是 app.py 檔案中的 app Flask 實例
    ]
    print(f"啟動 Gunicorn 伺服器，指令: {' '.join(gunicorn_command)}")
    try:
        subprocess.run(gunicorn_command, check=True)
    except FileNotFoundError:
        print("錯誤：找不到 Gunicorn 指令。請確保已安裝 Gunicorn 並將其加入到您的 PATH 環境變數中。")
        print("您可以透過以下指令安裝：pip install gunicorn")
    except subprocess.CalledProcessError as e:
        print(f"執行 Gunicorn 時發生錯誤: {e}")

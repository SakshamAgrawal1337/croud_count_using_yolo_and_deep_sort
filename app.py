from flask import Flask, redirect, url_for, render_template
from config import Config
from models import db, User
from werkzeug.security import generate_password_hash
from flask_jwt_extended import JWTManager
from blueprints.auth import auth_bp
from blueprints.dashboard import dashboard_bp
from blueprints.feeds import feeds_bp
from blueprints.analysis import analysis_bp
from blueprints.admin_panel import admin_panel_bp
import os

app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = "your-flask-secret-key"
app.config["JWT_SECRET_KEY"] = "super-secret-jwt-key"

jwt = JWTManager(app)
db.init_app(app)
with app.app_context():
    db.create_all()

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(feeds_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(admin_panel_bp)

@app.route("/")
def index():
    return redirect(url_for("auth.login"))

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
    # app.run(debug=True)

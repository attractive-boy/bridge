from flask import Flask, send_file, jsonify
from flask_cors import CORS
import netCDF4 as nc
import numpy as np
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/nc/<path:filename>')
def get_nc_data(filename):
    try:
        # 读取NC文件
        with nc.Dataset(filename, 'r') as ds:
            # 获取所有变量
            variables = {}
            for name, var in ds.variables.items():
                if len(var.shape) >= 3:  # 只处理3D或更高维度的数据
                    data = var[:].flatten()  # 将数据展平
                    variables[name] = {
                        'data': data.tolist(),
                        'dimensions': var.dimensions
                    }
            
            # 获取维度信息
            dimensions = {name: len(ds.dimensions[name]) for name in ds.dimensions}
            
            return jsonify({
                'variables': variables,
                'dimensions': dimensions
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 
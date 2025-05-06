import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function NcViewer({ ncPath }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('NcViewer 组件挂载，ncPath:', ncPath);
    
    if (!ncPath) {
      console.error('未提供 ncPath');
      setError('未提供文件路径');
      setLoading(false);
      return;
    }

    if (!containerRef.current) {
      console.error('容器元素不存在');
      setError('渲染容器不存在');
      setLoading(false);
      return;
    }

    console.log('开始初始化 3D 场景...');
    
    try {
      // 初始化场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;

      // 初始化相机
      const camera = new THREE.PerspectiveCamera(
        75,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 100);
      cameraRef.current = camera;

      // 初始化渲染器
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 添加轨道控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;

      // 添加环境光和平行光
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // 添加坐标轴辅助
      const axesHelper = new THREE.AxesHelper(50);
      scene.add(axesHelper);

      console.log('开始加载 NC 文件:', ncPath);
      
      // 加载并解析 NC 文件
      fetch(`http://localhost:5000/api/nc/${encodeURIComponent(ncPath)}`)
        .then(response => {
          console.log('收到服务器响应:', response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('收到数据:', data);
          try {
            if (data.error) {
              throw new Error(data.error);
            }

            if (!data.variables || Object.keys(data.variables).length === 0) {
              throw new Error('NC文件中没有找到变量数据');
            }

            const vertices = [];
            const colors = [];
            
            // 处理所有变量
            Object.entries(data.variables).forEach(([name, variable]) => {
              console.log(`处理变量: ${name}`, variable);
              const values = variable.data;
              if (!Array.isArray(values)) {
                console.warn(`变量 ${name} 的数据不是数组`);
                return;
              }
              
              for (let i = 0; i < values.length; i += 3) {
                if (i + 2 < values.length) {
                  vertices.push(values[i], values[i + 1], values[i + 2]);
                  
                  // 根据高度设置颜色
                  const height = values[i + 2];
                  const color = new THREE.Color();
                  color.setHSL((height + 1) / 2, 1, 0.5);
                  colors.push(color.r, color.g, color.b);
                }
              }
            });

            console.log(`处理完成，顶点数量: ${vertices.length / 3}`);

            if (vertices.length === 0) {
              throw new Error('NC文件中没有找到可显示的数据');
            }

            // 创建点云
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
              size: 0.5,
              vertexColors: true,
              sizeAttenuation: true
            });

            const points = new THREE.Points(geometry, material);
            scene.add(points);

            // 自动调整相机位置
            const box = new THREE.Box3().setFromObject(points);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));
            camera.position.z = cameraZ * 1.5;
            camera.lookAt(center);
            controls.target.copy(center);

            console.log('3D 场景初始化完成');
            setLoading(false);
          } catch (parseError) {
            console.error('NC 解析错误:', parseError);
            setError(`NC解析错误: ${parseError.message}`);
            setLoading(false);
          }
        })
        .catch(error => {
          console.error('加载 NC 文件失败:', error);
          setError(`加载NC文件失败: ${error.message}`);
          setLoading(false);
        });

      // 动画循环
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // 处理窗口大小变化
      const handleResize = () => {
        if (!containerRef.current) return;
        
        camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      };
      window.addEventListener('resize', handleResize);

      // 清理函数
      return () => {
        console.log('清理 3D 场景...');
        window.removeEventListener('resize', handleResize);
        if (containerRef.current && rendererRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        if (sceneRef.current) {
          sceneRef.current.traverse(object => {
            if (object.geometry) {
              object.geometry.dispose();
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          });
        }
        // 清除引用
        containerRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
        rendererRef.current = null;
        controlsRef.current = null;
      };
    } catch (error) {
      console.error('初始化 3D 场景失败:', error);
      setError(`初始化3D场景失败: ${error.message}`);
      setLoading(false);
    }
  }, [ncPath]);

  if (error) {
    return (
      <div style={{ 
        padding: 24, 
        color: 'red',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%'
      }}>
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        padding: 24, 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%'
      }}>
        加载中...
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

export default NcViewer; 
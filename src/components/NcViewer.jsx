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

  useEffect(() => {
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

    // 加载并解析 NC 文件
    fetch(ncPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(ncText => {
        try {
          console.log('NC文件内容:', ncText);
          
          // 解析NC文件内容
          const ncLines = ncText.split('\n');
          console.log('NC文件行数:', ncLines.length);
          
          const vertices = [];
          const indices = [];
          let currentPosition = new THREE.Vector3(0, 0, 0);

          ncLines.forEach((line, index) => {
            // 移除注释和空白字符
            line = line.split(';')[0].trim();
            if (!line) return;

            console.log(`处理第${index + 1}行:`, line);
            
            // 这里需要根据实际的NC文件格式进行解析
            // 这是一个简单的示例，假设NC文件包含G01命令
            if (line.includes('G01')) {
              const parts = line.split(' ');
              let x = currentPosition.x;
              let y = currentPosition.y;
              let z = currentPosition.z;

              parts.forEach(part => {
                if (part.startsWith('X')) x = parseFloat(part.substring(1));
                if (part.startsWith('Y')) y = parseFloat(part.substring(1));
                if (part.startsWith('Z')) z = parseFloat(part.substring(1));
              });

              console.log(`解析坐标: X=${x}, Y=${y}, Z=${z}`);

              vertices.push(currentPosition.x, currentPosition.y, currentPosition.z);
              vertices.push(x, y, z);

              const startIndex = vertices.length / 3 - 2;
              indices.push(startIndex, startIndex + 1);

              currentPosition.set(x, y, z);
            }
          });

          console.log('解析后的顶点数:', vertices.length / 3);
          console.log('解析后的索引数:', indices.length);

          if (vertices.length === 0) {
            setError('NC文件中没有找到可显示的路径');
            return;
          }

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          geometry.setIndex(indices);

          const material = new THREE.LineBasicMaterial({ color: 0x000000 });
          const ncLinesMesh = new THREE.LineSegments(geometry, material);
          scene.add(ncLinesMesh);

          // 自动调整相机位置
          const box = new THREE.Box3().setFromObject(ncLinesMesh);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));
          camera.position.z = cameraZ * 1.5;
          camera.lookAt(center);
          controls.target.copy(center);
        } catch (parseError) {
          console.error('NC parsing error:', parseError);
          setError(`NC解析错误: ${parseError.message}`);
        }
      })
      .catch(error => {
        console.error('Error loading NC file:', error);
        setError(`加载NC文件失败: ${error.message}`);
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

export default NcViewer; 
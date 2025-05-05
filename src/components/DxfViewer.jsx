import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import DxfParser from 'dxf-parser';

function DxfViewer({ dxfPath }) {
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

    // 加载并解析 DXF 文件
    console.log('Loading DXF from:', dxfPath);
    
    fetch(dxfPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(dxfText => {
        console.log('DXF file content:', dxfText.substring(0, 1000)); // 打印文件前1000个字符用于调试
        
        try {
          const parser = new DxfParser();
          const dxf = parser.parseSync(dxfText);
          console.log('Parsed DXF:', dxf); // 打印解析后的对象用于调试
          
          if (!dxf || !dxf.entities || !Array.isArray(dxf.entities)) {
            throw new Error('Invalid DXF format: missing entities');
          }
          
          console.log('DXF entities:', dxf.entities); // 打印所有实体
          console.log('DXF blocks:', dxf.blocks); // 打印所有块
          
          // 创建几何体
          const geometry = new THREE.BufferGeometry();
          const vertices = [];
          const indices = [];

          // 处理 DXF 中的线条
          dxf.entities.forEach(entity => {
            console.log('Processing entity:', entity); // 打印每个实体
            if (entity.type === 'LINE') {
              const start = new THREE.Vector3(entity.start.x, entity.start.y, entity.start.z || 0);
              const end = new THREE.Vector3(entity.end.x, entity.end.y, entity.end.z || 0);
              
              vertices.push(start.x, start.y, start.z);
              vertices.push(end.x, end.y, end.z);
              
              const startIndex = vertices.length / 3 - 2;
              indices.push(startIndex, startIndex + 1);
            } else if (entity.type === 'SPLINE') {
              // 处理样条曲线
              if (entity.controlPoints && entity.controlPoints.length > 0) {
                entity.controlPoints.forEach((point, index) => {
                  if (index < entity.controlPoints.length - 1) {
                    const start = new THREE.Vector3(point.x, point.y, point.z || 0);
                    const end = new THREE.Vector3(
                      entity.controlPoints[index + 1].x,
                      entity.controlPoints[index + 1].y,
                      entity.controlPoints[index + 1].z || 0
                    );
                    
                    vertices.push(start.x, start.y, start.z);
                    vertices.push(end.x, end.y, end.z);
                    
                    const startIndex = vertices.length / 3 - 2;
                    indices.push(startIndex, startIndex + 1);
                  }
                });
              }
            } else if (entity.type === 'INSERT' && dxf.blocks) {
              // 处理块引用
              const block = dxf.blocks[entity.name];
              if (block && block.entities) {
                block.entities.forEach(blockEntity => {
                  if (blockEntity.type === 'LINE') {
                    // 应用块的变换（位置和旋转）
                    const start = new THREE.Vector3(
                      blockEntity.start.x + entity.position.x,
                      blockEntity.start.y + entity.position.y,
                      (blockEntity.start.z || 0) + entity.position.z
                    );
                    const end = new THREE.Vector3(
                      blockEntity.end.x + entity.position.x,
                      blockEntity.end.y + entity.position.y,
                      (blockEntity.end.z || 0) + entity.position.z
                    );
                    
                    vertices.push(start.x, start.y, start.z);
                    vertices.push(end.x, end.y, end.z);
                    
                    const startIndex = vertices.length / 3 - 2;
                    indices.push(startIndex, startIndex + 1);
                  } else if (blockEntity.type === 'SPLINE') {
                    // 处理块中的样条曲线
                    if (blockEntity.controlPoints && blockEntity.controlPoints.length > 0) {
                      blockEntity.controlPoints.forEach((point, index) => {
                        if (index < blockEntity.controlPoints.length - 1) {
                          const start = new THREE.Vector3(
                            point.x + entity.position.x,
                            point.y + entity.position.y,
                            (point.z || 0) + entity.position.z
                          );
                          const end = new THREE.Vector3(
                            blockEntity.controlPoints[index + 1].x + entity.position.x,
                            blockEntity.controlPoints[index + 1].y + entity.position.y,
                            (blockEntity.controlPoints[index + 1].z || 0) + entity.position.z
                          );
                          
                          vertices.push(start.x, start.y, start.z);
                          vertices.push(end.x, end.y, end.z);
                          
                          const startIndex = vertices.length / 3 - 2;
                          indices.push(startIndex, startIndex + 1);
                        }
                      });
                    }
                  }
                });
              }
            }
          });

          if (vertices.length === 0) {
            console.warn('No valid lines or splines found in DXF file');
            // 不再抛出错误，而是显示一个提示
            setError('DXF文件中没有找到可显示的线条或样条曲线');
            return;
          }

          geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          geometry.setIndex(indices);

          const material = new THREE.LineBasicMaterial({ color: 0x000000 });
          const lines = new THREE.LineSegments(geometry, material);
          scene.add(lines);

          // 自动调整相机位置以显示整个模型
          const box = new THREE.Box3().setFromObject(lines);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));
          camera.position.z = cameraZ * 1.5;
          camera.lookAt(center);
          controls.target.copy(center);
        } catch (parseError) {
          console.error('DXF parsing error:', parseError);
          setError(`DXF解析错误: ${parseError.message}`);
        }
      })
      .catch(error => {
        console.error('Error loading DXF file:', error);
        setError(`加载DXF文件失败: ${error.message}`);
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
    };
  }, [dxfPath]);

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

export default DxfViewer; 
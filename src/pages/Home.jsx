import React, { useEffect, useRef } from 'react';
import { ProCard, message } from '@ant-design/pro-components';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkPoints from '@kitware/vtk.js/Common/Core/Points';
import vtkCellArray from '@kitware/vtk.js/Common/Core/CellArray';
import DxfParser from 'dxf-parser';

function Home() {
  const containerRef = useRef(null);
  const renderWindowRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      // 创建渲染窗口
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: containerRef.current,
        background: [0.2, 0.2, 0.2],
      });
      renderWindowRef.current = fullScreenRenderer;

      // 加载并解析 DXF 文件
      fetch('/models/斜拉桥.dxf')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(dxfText => {
          try {
            const parser = new DxfParser();
            const dxf = parser.parseSync(dxfText);
            
            if (!dxf || !dxf.entities || dxf.entities.length === 0) {
              throw new Error('DXF 文件内容为空或格式不正确');
            }
            
            // 创建 VTK 数据结构
            const points = vtkPoints.newInstance();
            const lines = vtkCellArray.newInstance();
            
            // 处理 DXF 数据
            let pointCount = 0;
            dxf.entities.forEach(entity => {
              if (entity.type === 'LINE') {
                const point1 = points.insertNextPoint([
                  entity.start.x || 0,
                  entity.start.y || 0,
                  entity.start.z || 0
                ]);
                const point2 = points.insertNextPoint([
                  entity.end.x || 0,
                  entity.end.y || 0,
                  entity.end.z || 0
                ]);
                lines.insertNextCell([point1, point2]);
                pointCount += 2;
              }
            });

            if (pointCount === 0) {
              throw new Error('未找到可渲染的线条数据');
            }
            
            // 创建 PolyData
            const polyData = vtkPolyData.newInstance();
            polyData.setPoints(points);
            polyData.setLines(lines);
            
            // 创建渲染管线
            const mapper = vtkMapper.newInstance();
            mapper.setInputData(polyData);
            
            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);
            
            const renderer = renderWindowRef.current.getRenderer();
            renderer.addActor(actor);
            renderer.resetCamera();
            renderWindowRef.current.render();

            message.success('DXF 文件加载成功');
          } catch (error) {
            console.error('DXF 解析错误:', error);
            message.error(`DXF 文件解析失败: ${error.message}`);
          }
        })
        .catch(error => {
          console.error('文件加载错误:', error);
          message.error(`文件加载失败: ${error.message}`);
        });
    }

    return () => {
      if (renderWindowRef.current) {
        renderWindowRef.current.delete();
      }
    };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <ProCard>
        <div
          ref={containerRef}
          style={{ width: '100%', height: '600px' }}
        />
      </ProCard>
    </div>
  );
}

export default Home; 
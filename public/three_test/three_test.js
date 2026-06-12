// ----------------------------------------------------
        // 1. 데이터 정의 (서버 API 로드 안될 때의 로컬 예비용 fallback)
        // ----------------------------------------------------
        const fallbackData = {
            "q": {
                "w": [0.0, 15, 169.28],
                "e": [13.33, 15, 237.07],
                "r": [26.67, 17, 273.19],
                "a": [346.67, 12, 408.94],
                "s": [293.33, 16, 219.35],
                "g": [173.33, 23, 372.03],
                "k": [133.33, 12, 495.81]
            },
            "w": {
                "e": [0.0, 10, 187.72],
                "r": [13.33, 20, 235.90],
                "s": [306.67, 12, 439.03],
                "a": [333.33, 17, 259.79]
            },
            "a": {
                "s": [0.0, 18, 142.10],
                "d": [15.0, 14, 210.50],
                "q": [270.0, 9, 310.20],
                "z": [325.0, 11, 280.40]
            }
        };

        let pairVectors = fallbackData; // 전체 데이터셋
        
        // 스케일 인자 (3D 뷰포트에 잘 밀착되도록 수치 조정)
        const SCALE_R = 0.3;     // 빈도수 스케일 (가로 XZ 반지름)
        const SCALE_Z = 0.015;   // 지연시간 스케일 (세로 Y 높이)

        // UI 요소
        const selectTo = document.getElementById('select-to');
        const selectFrom = document.getElementById('select-from');
        const badgeTo = document.getElementById('badge-to');
        const badgeFrom = document.getElementById('badge-from');
        
        const cellR = document.getElementById('cell-r');
        const cellTheta = document.getElementById('cell-theta');
        const cellZ = document.getElementById('cell-z');
        const cellX = document.getElementById('cell-x');
        const cellY = document.getElementById('cell-y');
        const cellZCart = document.getElementById('cell-z-cart');
        
        const formulaX = document.getElementById('formula-x');
        const formulaZ = document.getElementById('formula-z');
        
        const labelOrigin = document.getElementById('label-origin');
        const labelTarget = document.getElementById('label-target');

        // 토글 제어 요소
        const toggleCylinder = document.getElementById('toggle-cylinder');
        const toggleGrid = document.getElementById('toggle-grid');
        const toggleProjections = document.getElementById('toggle-projections');
        const togglePetal = document.getElementById('toggle-petal');
        const toggleRotation = document.getElementById('toggle-rotation');

        // ----------------------------------------------------
        // 2. Three.js 환경 변수 및 초기 설정
        // ----------------------------------------------------
        let scene, camera, renderer, controls;
        
        // 3D 시각화 객체들을 담을 그룹
        const visualGroup = new THREE.Group();
        let gridHelper, ambientLight, dirLight, pointLight;
        
        // 개별 그래픽 오브젝트 레퍼런스
        let originMesh, targetMesh, vectorArrow, cylinderGuide, projectionGroup, petalMesh, petalBorder;

        // 현재 시각화 정보 상태
        let curToKey = 'q';
        let curFromKey = 'w';
        let xVal = 0, yVal = 0, zVal = 0; // Cartesian
        let rRaw = 0, thetaRaw = 0, zRaw = 0; // Cylindrical

        function initThree() {
            // 씬 생성
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x090d16);
            scene.fog = new THREE.FogExp2(0x090d16, 0.015);

            // 카메라 생성
            camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(7, 8, 10);

            // 렌더러 생성
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            document.getElementById('canvas-container').appendChild(renderer.domElement);

            // OrbitControls 설정
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2 + 0.05; // 땅 뚫고 내려가지 않게 설정
            controls.minDistance = 3;
            controls.maxDistance = 25;

            // 씬에 시각화 그룹 추가
            scene.add(visualGroup);

            // 조명 추가
            ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
            scene.add(ambientLight);

            dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
            dirLight.position.set(5, 15, 5);
            dirLight.castShadow = true;
            scene.add(dirLight);

            // 벡터 구체 끝단에 네온 발광을 더해줄 포인트 라이트
            pointLight = new THREE.PointLight(0x06b6d4, 1.5, 15);
            scene.add(pointLight);

            // 격자 바닥 추가
            gridHelper = new THREE.GridHelper(24, 24, 0x475569, 0x1e293b);
            scene.add(gridHelper);

            // 간단한 좌표축(XYZ) 표시선 추가 (붉은색: X, 녹색: Y, 청색: Z)
            const axesHelper = new THREE.AxesHelper(1.5);
            // 축 선 굵기 조절은 WebGL 한계가 있어 그냥 기본 얇은 선으로 노출
            scene.add(axesHelper);

            animate();
        }

        // ----------------------------------------------------
        // 3. 3D 화합물 생성 및 업데이트 로직
        // ----------------------------------------------------

        // volumetric 한 3차원 벡터 화살표 생성 (실제 빛나는 실린더 형태 기둥 + 원뿔 팁)
        // 기존 1px 얇은 선보다 훨씬 선명하고 입체적으로 표현됨
        function create3DArrow(start, end, colorHex) {
            const arrowGroup = new THREE.Group();
            
            const direction = new THREE.Vector3().subVectors(end, start);
            const length = direction.length();
            
            if (length < 0.1) return arrowGroup;

            const shaftRadius = 0.08;
            const headLength = Math.min(0.6, length * 0.25);
            const headRadius = 0.18;
            const shaftLength = length - headLength;

            // 실린더 뼈대 (Shaft)
            if (shaftLength > 0) {
                const shaftGeom = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 16);
                shaftGeom.translate(0, shaftLength / 2, 0); // 밑단을 원점으로 조정
                
                const shaftMat = new THREE.MeshStandardMaterial({
                    color: colorHex,
                    emissive: colorHex,
                    emissiveIntensity: 0.5,
                    roughness: 0.2,
                    metalness: 0.8
                });
                const shaft = new THREE.Mesh(shaftGeom, shaftMat);
                arrowGroup.add(shaft);
            }

            // 원뿔 머리 (Cone Tip)
            const coneGeom = new THREE.ConeGeometry(headRadius, headLength, 16);
            coneGeom.translate(0, length - headLength / 2, 0); // 머리 끝이 도착지에 오도록
            
            const coneMat = new THREE.MeshStandardMaterial({
                color: colorHex,
                emissive: colorHex,
                emissiveIntensity: 0.8,
                roughness: 0.2,
                metalness: 0.8
            });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            arrowGroup.add(cone);

            // 화살표 방향 회전 정렬
            const up = new THREE.Vector3(0, 1, 0);
            direction.normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
            arrowGroup.setRotationFromQuaternion(quaternion);
            arrowGroup.position.copy(start);

            return arrowGroup;
        }

        // 부채꼴 회전 각도(θ)를 시각화해줄 바닥 평면 호(Arc) 생성
        function createAngleArc(radius, thetaRad, colorHex) {
            if (thetaRad <= 0.01) return new THREE.Group();
            
            // 호(Arc)의 파편 생성
            const curve = new THREE.EllipseCurve(
                0, 0,             // ax, aY
                radius, radius,   // xRadius, yRadius
                0, thetaRad,      // aStartAngle, aEndAngle
                false,            // aClockwise
                0                 // aRotation
            );

            const points = curve.getPoints(Math.max(10, Math.floor(thetaRad * 30)));
            // EllipseCurve의 XY를 Three.js 바닥인 XZ 평면으로 매핑
            const xzPoints = points.map(p => new THREE.Vector3(p.x, 0, p.y));
            
            const geom = new THREE.BufferGeometry().setFromPoints(xzPoints);
            const mat = new THREE.LineBasicMaterial({ 
                color: colorHex,
                linewidth: 2 // 대부분 지원안되지만 폴백 대비
            });
            
            const line = new THREE.Line(geom, mat);
            
            // 각도 표시용 사이 영역을 덮을 얇은 투명 판 (선택 사항 - 부채꼴 면)
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            points.forEach(p => shape.lineTo(p.x, p.y));
            shape.lineTo(0, 0);
            
            const shapeGeom = new THREE.ShapeGeometry(shape);
            const shapeMat = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.08,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(shapeGeom, shapeMat);
            mesh.rotation.x = Math.PI / 2; // Flat on floor
            
            const arcGroup = new THREE.Group();
            arcGroup.add(line);
            arcGroup.add(mesh);
            return arcGroup;
        }

        // 선택된 데이터 기반으로 3D 오브젝트들 실시간 재생성
        function update3DScene() {
            // 기존 오브젝트들 제거
            while(visualGroup.children.length > 0){ 
                const obj = visualGroup.children[0];
                visualGroup.remove(obj); 
            }

            petalMesh = null;
            petalBorder = null;

            // 만약 선택된 키 쌍 정보가 올바르지 않다면 스킵
            if (!pairVectors[curToKey] || !pairVectors[curToKey][curFromKey]) return;

            // 0. 꽃잎형 곡면 (Petal Surface) 및 외곽 테두리 (Petal Border) 생성
            const vectorList = [];
            const allFromKeys = Object.keys(pairVectors[curToKey]);
            allFromKeys.forEach(fKey => {
                const data = pairVectors[curToKey][fKey];
                const theta = data[0];
                const freq = data[1];
                const lat = data[2];

                const rad = theta * Math.PI / 180;
                const vx = freq * SCALE_R * Math.cos(rad);
                const vz = freq * SCALE_R * Math.sin(rad);
                const vy = lat * SCALE_Z;

                vectorList.push({
                    key: fKey,
                    theta: theta,
                    vx: vx,
                    vy: vy,
                    vz: vz,
                    latency: lat
                });
            });

            // theta 각도 순으로 정렬
            vectorList.sort((a, b) => a.theta - b.theta);

            if (vectorList.length >= 3) {
                const vertices = [];
                const colors = [];

                // 원점 버텍스
                vertices.push(0, 0, 0);
                const originColor = new THREE.Color(0xec4899); // 핫핑크
                colors.push(originColor.r, originColor.g, originColor.b);

                // 각 종점 버텍스 및 색상 추가
                vectorList.forEach(v => {
                    vertices.push(v.vx, v.vy, v.vz);

                    // 지연 시간(latency)에 따라 청록(0x06b6d4, 100ms) ~ 앰버(0xfbbf24, 800ms) 그라데이션
                    const minLat = 100;
                    const maxLat = 800;
                    const t = Math.min(1, Math.max(0, (v.latency - minLat) / (maxLat - minLat)));
                    
                    const r = 0.02 + t * (0.98 - 0.02);
                    const g = 0.71 + t * (0.75 - 0.71);
                    const b = 0.83 + t * (0.14 - 0.83);

                    colors.push(r, g, b);
                });

                // 인덱스 생성
                const indices = [];
                const N = vectorList.length;
                for (let i = 1; i <= N; i++) {
                    const next = (i === N) ? 1 : i + 1;
                    indices.push(0, i, next);
                }

                const petalGeom = new THREE.BufferGeometry();
                petalGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                petalGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                petalGeom.setIndex(indices);
                petalGeom.computeVertexNormals();

                const petalMat = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.55,
                    side: THREE.DoubleSide,
                    roughness: 0.3,
                    metalness: 0.1,
                    depthWrite: false
                });

                petalMesh = new THREE.Mesh(petalGeom, petalMat);
                petalMesh.castShadow = true;
                petalMesh.receiveShadow = true;
                visualGroup.add(petalMesh);

                // 외곽 테두리선(Border Line) 생성
                const borderPoints = [];
                vectorList.forEach(v => {
                    borderPoints.push(new THREE.Vector3(v.vx, v.vy, v.vz));
                });
                if (borderPoints.length > 0) {
                    borderPoints.push(borderPoints[0].clone()); // 폐곡선 닫기
                }

                const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
                const borderMat = new THREE.LineBasicMaterial({
                    color: 0x06b6d4, // 청록 외곽선
                    linewidth: 1.5,
                    transparent: true,
                    opacity: 0.75
                });
                petalBorder = new THREE.Line(borderGeom, borderMat);
                visualGroup.add(petalBorder);
            }

            // 1. 선택된 to 키의 모든 유입 from 키 벡터들을 순회하며 비활성 벡터 그리기
            const fromKeys = Object.keys(pairVectors[curToKey]);
            fromKeys.forEach(fKey => {
                // 선택된 from 키는 나중에 개별 하이라이트(3D 화살표 등)하므로 여기서 그리지 않고 스킵
                if (fKey === curFromKey) return;

                const data = pairVectors[curToKey][fKey];
                const theta = data[0];  // degree
                const freq = data[1];   // frequency
                const lat = data[2];    // latency (ms)

                const rad = theta * Math.PI / 180;
                const vx = freq * SCALE_R * Math.cos(rad);
                const vz = freq * SCALE_R * Math.sin(rad); // XZ 평면이므로 sin 값은 Z에 대입
                const vy = lat * SCALE_Z;

                // 비활성 벡터: 얇고 흐린 반투명 파란색/청록색 실선
                const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(vx, vy, vz)];
                const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
                const lineMat = new THREE.LineBasicMaterial({
                    color: 0x3b82f6,
                    transparent: true,
                    opacity: 0.25
                });
                const line = new THREE.Line(lineGeom, lineMat);
                visualGroup.add(line);

                // 비활성 벡터 종점: 작은 구체
                const sphereGeom = new THREE.SphereGeometry(0.05, 16, 16);
                const sphereMat = new THREE.MeshBasicMaterial({
                    color: 0x06b6d4,
                    transparent: true,
                    opacity: 0.35
                });
                const sphere = new THREE.Mesh(sphereGeom, sphereMat);
                sphere.position.set(vx, vy, vz);
                visualGroup.add(sphere);
            });

            // 2. 활성(선택된) 키 쌍 정보 설정 및 계산
            const dataArr = pairVectors[curToKey][curFromKey];
            thetaRaw = dataArr[0];  // degree
            rRaw = dataArr[1];      // frequency
            zRaw = dataArr[2];      // latency (ms)

            // 라디안 각도 계산
            const thetaRad = thetaRaw * Math.PI / 180;

            // 스케일링된 실제 데카르트 좌표 연산 (Y를 높이축으로 매핑)
            xVal = rRaw * SCALE_R * Math.cos(thetaRad);
            zVal = rRaw * SCALE_R * Math.sin(thetaRad); // XZ 평면이므로 sin 값은 Z에 대입
            yVal = zRaw * SCALE_Z;

            // 수치 반올림
            const xRounded = xVal.toFixed(3);
            const yRounded = yVal.toFixed(3);
            const zRounded = zVal.toFixed(3);

            // 포인트 라이트 타겟 구체 쪽으로 이동
            pointLight.position.set(xVal, yVal, zVal);
            pointLight.color.setHex(0x06b6d4);

            // ----------------------------------------------------
            // 3A. 기하학적 형상 추가
            // ----------------------------------------------------

            // [1] 원점 (Target Key / To Key) 구체 - 발광 핫핑크
            const originGeom = new THREE.SphereGeometry(0.25, 32, 32);
            const originMat = new THREE.MeshStandardMaterial({
                color: 0xec4899,
                emissive: 0xec4899,
                emissiveIntensity: 0.6,
                roughness: 0.1,
                metalness: 0.9
            });
            originMesh = new THREE.Mesh(originGeom, originMat);
            originMesh.position.set(0, 0, 0);
            visualGroup.add(originMesh);

            // [2] 대상 위치 (Source Key / From Key) 구체 - 발광 네온 시안
            const targetGeom = new THREE.SphereGeometry(0.2, 32, 32);
            const targetMat = new THREE.MeshStandardMaterial({
                color: 0x06b6d4,
                emissive: 0x06b6d4,
                emissiveIntensity: 0.8,
                roughness: 0.1,
                metalness: 0.9
            });
            targetMesh = new THREE.Mesh(targetGeom, targetMat);
            targetMesh.position.set(xVal, yVal, zVal);
            visualGroup.add(targetMesh);

            // [3] 벡터 화살표 (Line Segment) - 입체적이며 매우 선명한 오렌지/앰버 컬러 기둥
            // 사용자 요구사항인 "벡터 선으로 잘 보이게 해"를 위해 두께감과 광원 발광 추가
            const startVec = new THREE.Vector3(0, 0, 0);
            const endVec = new THREE.Vector3(xVal, yVal, zVal);
            vectorArrow = create3DArrow(startVec, endVec, 0xf59e0b);
            visualGroup.add(vectorArrow);

            // [4] 원통형 가이드 봉투 (Cylinder wireframe envelope)
            // 반지름 r, 높이 y 만큼의 투명한 그물망 실린더를 얹어 원통좌표계 범위 인식 지원
            const cylRadius = rRaw * SCALE_R;
            const cylHeight = yVal;
            
            if (cylRadius > 0.05 && cylHeight > 0.05) {
                // Open ended = true, 세그먼트 밀도 적절히 조절
                const cylGeom = new THREE.CylinderGeometry(cylRadius, cylRadius, cylHeight, 32, 4, true);
                const cylMat = new THREE.MeshBasicMaterial({
                    color: 0x3b82f6,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.10,
                    side: THREE.DoubleSide
                });
                cylinderGuide = new THREE.Mesh(cylGeom, cylMat);
                // 실린더의 정중앙 좌표가 세로 정가운데가 되므로 Y축 방향으로 높이의 반만큼 올려줌
                cylinderGuide.position.set(0, cylHeight / 2, 0);
                visualGroup.add(cylinderGuide);

                // 원통의 바닥 평면 원형 실선 테두리
                const ringGeom = new THREE.RingGeometry(cylRadius - 0.02, cylRadius + 0.02, 64);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0x3b82f6,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide
                });
                const bottomRing = new THREE.Mesh(ringGeom, ringMat);
                bottomRing.rotation.x = Math.PI / 2;
                visualGroup.add(bottomRing);

                // 원통의 천장 평면 원형 실선 테두리
                const topRing = bottomRing.clone();
                topRing.position.y = cylHeight;
                visualGroup.add(topRing);
            }

            // [5] 투영선 그룹 (Projections)
            projectionGroup = new THREE.Group();

            // (A) 시작 키에서 바닥 평면으로 수직 낙하하는 점선 (Y 높이축 가이드)
            const dropPoints = [new THREE.Vector3(xVal, yVal, zVal), new THREE.Vector3(xVal, 0, zVal)];
            const dropGeom = new THREE.BufferGeometry().setFromPoints(dropPoints);
            const dropMat = new THREE.LineDashedMaterial({
                color: 0x10b981, // 녹색 점선
                dashSize: 0.2,
                gapSize: 0.1
            });
            const dropLine = new THREE.Line(dropGeom, dropMat);
            dropLine.computeLineDistances();
            projectionGroup.add(dropLine);

            // (B) 바닥 원점(0,0,0)에서 바닥 투영점(x, 0, z)까지의 지름 연결선 (반지름 r 가이드)
            const radPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(xVal, 0, zVal)];
            const radGeom = new THREE.BufferGeometry().setFromPoints(radPoints);
            const radMat = new THREE.LineDashedMaterial({
                color: 0x94a3b8, // 회색 점선
                dashSize: 0.2,
                gapSize: 0.1
            });
            const radLine = new THREE.Line(radGeom, radMat);
            radLine.computeLineDistances();
            projectionGroup.add(radLine);

            // (C) 바닥 평면 상의 회전각(θ) 표시용 호 및 색채 면
            const angleArc = createAngleArc(Math.min(cylRadius, 1.2), thetaRad, 0xfbbf24);
            projectionGroup.add(angleArc);

            visualGroup.add(projectionGroup);

            // 토글값 적용 상태 갱신
            applyToggles();

            // ----------------------------------------------------
            // 3B. 대시보드 UI 글자 업데이트
            // ----------------------------------------------------
            badgeTo.textContent = curToKey.toUpperCase();
            badgeFrom.textContent = curFromKey.toUpperCase();

            cellR.textContent = `${rRaw} 회`;
            cellTheta.textContent = `${thetaRaw}° (${thetaRad.toFixed(3)} rad)`;
            cellZ.textContent = `${zRaw} ms`;

            cellX.textContent = xRounded;
            cellY.textContent = yRounded;
            cellZCart.textContent = zRounded;

            formulaX.textContent = `X = ${rRaw} * cos(${thetaRaw}°) = ${xRounded}`;
            formulaZ.textContent = `Z = ${rRaw} * sin(${thetaRaw}°) = ${zRounded}`;

            // Floating Label 텍스트 갱신
            labelOrigin.textContent = `Origin (To): ${curToKey.toUpperCase()} [0, 0, 0]`;
            labelTarget.textContent = `Vector (From): ${curFromKey.toUpperCase()} [${xRounded}, ${yRounded}, ${zRounded}]`;
        }

        // 토글 스위치 상태 적용
        function applyToggles() {
            if (cylinderGuide) cylinderGuide.visible = toggleCylinder.checked;
            if (gridHelper) gridHelper.visible = toggleGrid.checked;
            if (projectionGroup) projectionGroup.visible = toggleProjections.checked;
            if (petalMesh) petalMesh.visible = togglePetal.checked;
            if (petalBorder) petalBorder.visible = togglePetal.checked;
        }

        // ----------------------------------------------------
        // 4. 애니메이션 루프 및 2D 라벨 투영
        // ----------------------------------------------------
        function animate() {
            requestAnimationFrame(animate);

            // 자동 카메라 궤도 회전 옵션이 켜져 있을 때 회전 처리
            if (toggleRotation.checked) {
                // Y축 기준으로 가볍게 씬을 회전시키거나 카메라의 각도를 증가
                const time = Date.now() * 0.0005;
                camera.position.x = Math.sin(time) * 11 + 0;
                camera.position.z = Math.cos(time) * 11 + 0;
                camera.lookAt(0, 1.5, 0);
            }

            controls.update();
            renderer.render(scene, camera);

            // 2D 텍스트 레이블을 3D 좌표 위에 고정 투영시킴
            updateLabelsProjection();
        }

        // 3D 객체의 위치를 브라우저 2D 좌표로 환산하여 레이블 정렬
        function updateLabelsProjection() {
            if (!camera || !renderer) return;

            const widthHalf = window.innerWidth / 2;
            const heightHalf = window.innerHeight / 2;

            // 1. 원점 (To Key) 레이블 정렬
            const originVec = new THREE.Vector3(0, 0, 0);
            originVec.project(camera);

            // 카메라 시야 반대편(뒤편)에 위치할 때 숨김 처리
            if (originVec.z > 1) {
                labelOrigin.style.opacity = '0';
            } else {
                labelOrigin.style.opacity = '1';
                const x = (originVec.x * widthHalf) + widthHalf;
                const y = -(originVec.y * heightHalf) + heightHalf;
                labelOrigin.style.left = `${x}px`;
                labelOrigin.style.top = `${y - 18}px`; // 객체 약간 위쪽에 오버레이
            }

            // 2. 벡터 종점 (From Key) 레이블 정렬
            if (targetMesh) {
                const targetVec = new THREE.Vector3(xVal, yVal, zVal);
                targetVec.project(camera);

                if (targetVec.z > 1) {
                    labelTarget.style.opacity = '0';
                } else {
                    labelTarget.style.opacity = '1';
                    const x = (targetVec.x * widthHalf) + widthHalf;
                    const y = -(targetVec.y * heightHalf) + heightHalf;
                    labelTarget.style.left = `${x}px`;
                    labelTarget.style.top = `${y - 18}px`;
                }
            }
        }

        // ----------------------------------------------------
        // 5. 백엔드 데이터 불러오기 및 이벤트 핸들링
        // ----------------------------------------------------

        // 드롭다운 메뉴 생성
        function buildSelectors() {
            // To Key 채우기
            selectTo.innerHTML = '';
            const toKeys = Object.keys(pairVectors).sort();
            toKeys.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = k.toUpperCase();
                selectTo.appendChild(opt);
            });

            // 초기값 설정
            if (toKeys.includes(curToKey)) {
                selectTo.value = curToKey;
            } else if (toKeys.length > 0) {
                curToKey = toKeys[0];
                selectTo.value = curToKey;
            }

            updateFromSelector();
        }

        // To Key 변경 시 해당 키로 전입하는 From Key 목록 필터링
        function updateFromSelector() {
            selectFrom.innerHTML = '';
            curToKey = selectTo.value;

            if (!pairVectors[curToKey]) return;

            const fromKeys = Object.keys(pairVectors[curToKey]).sort();
            fromKeys.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = k.toUpperCase();
                selectFrom.appendChild(opt);
            });

            // 초기값 선택 처리
            if (fromKeys.includes(curFromKey)) {
                selectFrom.value = curFromKey;
            } else if (fromKeys.length > 0) {
                curFromKey = fromKeys[0];
                selectFrom.value = curFromKey;
            }

            update3DScene();
        }

        // 백엔드 API 연동
        async function fetchPairVectors() {
            try {
                const response = await fetch('/api/pair_vectors');
                if (response.ok) {
                    const data = await response.json();
                    if (data && Object.keys(data).length > 0) {
                        pairVectors = data; // 서버 데이터 사용
                        console.log("Successfully loaded pair vectors from backend.");
                    }
                } else {
                    console.warn("Backend API not reachable. Using fallback presets.");
                }
            } catch (err) {
                console.error("Network error fetching pair vectors:", err);
            } finally {
                // 최종 UI 연동 처리
                buildSelectors();
            }
        }

        // 리스너 바인딩
        selectTo.addEventListener('change', updateFromSelector);
        selectFrom.addEventListener('change', () => {
            curFromKey = selectFrom.value;
            update3DScene();
        });

        // 토글 제어 이벤트
        toggleCylinder.addEventListener('change', applyToggles);
        toggleGrid.addEventListener('change', applyToggles);
        toggleProjections.addEventListener('change', applyToggles);
        togglePetal.addEventListener('change', applyToggles);

        // 창 크기 조절
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 초기 시작
        window.addEventListener('DOMContentLoaded', () => {
            initThree();
            fetchPairVectors();
        });
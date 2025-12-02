@echo off
chcp 65001 >nul
echo BẮT ĐẦU RESET DOCKER (bao gồm Docker Compose)...
echo ==========================================

echo 1. Đang dừng Docker Compose services...
docker-compose down -v --rmi all --remove-orphans 2>nul

echo 2. Đang dừng tất cả containers...
for /f "tokens=*" %%i in ('docker ps -aq 2^>nul') do (
    docker stop %%i 2>nul
)

echo 3. Đang xóa tất cả containers...
for /f "tokens=*" %%i in ('docker ps -aq 2^>nul') do (
    docker rm -f %%i 2>nul
)

echo 4. Đang xóa tất cả images...
for /f "tokens=*" %%i in ('docker images -aq 2^>nul') do (
    docker rmi -f %%i 2>nul
)

echo 5. Đang xóa tất cả volumes...
for /f "tokens=*" %%i in ('docker volume ls -q 2^>nul') do (
    docker volume rm -f %%i 2>nul
)

echo 6. Đang xóa tất cả networks...
for /f "tokens=*" %%i in ('docker network ls -q 2^>nul') do (
    echo %%i | findstr /v /c:"bridge" /c:"host" /c:"none" >nul && docker network rm %%i 2>nul
)

echo 7. Đang dọn dẹp hệ thống Docker...
docker system prune -a -f --volumes 2>nul

echo 8. Đang xóa builder cache...
docker builder prune -a -f 2>nul

echo 9. Đang xóa Docker Compose cache...
docker-compose rm -f -v -s 2>nul

echo 10. Kiểm tra trạng thái sau reset:
echo ------------------------------------------
for /f "tokens=*" %%i in ('docker ps -aq 2^>nul ^| find /c /v ""') do set containers=%%i
for /f "tokens=*" %%i in ('docker images -q 2^>nul ^| find /c /v ""') do set images=%%i
for /f "tokens=*" %%i in ('docker volume ls -q 2^>nul ^| find /c /v ""') do set volumes=%%i
for /f "tokens=*" %%i in ('docker network ls -q 2^>nul ^| find /c /v ""') do set networks=%%i

echo Containers: %containers%
echo Images: %images%
echo Volumes: %volumes%
echo Networks: %networks%
echo ------------------------------------------

echo RESET HOÀN TẤT! Docker và Docker Compose đã sạch sẽ như mới cài đặt.
pause
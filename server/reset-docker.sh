#!/bin/bash

echo "BẮT ĐẦU RESET DOCKER(bao gồm Docker Compose)..."
echo "=========================================="


echo "1. Đang dừng Docker Compose services..."
docker-compose down -v --rmi all --remove-orphans 2>/dev/null || true


echo "2. Đang dừng tất cả containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "3. Đang xóa tất cả containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || true

echo "4. Đang xóa tất cả images..."
docker rmi -f $(docker images -aq) 2>/dev/null || true


echo "5. Đang xóa tất cả volumes..."
docker volume rm -f $(docker volume ls -q) 2>/dev/null || true


echo "6. Đang xóa tất cả networks..."
docker network rm $(docker network ls -q | grep -v -E "(bridge|host|none)") 2>/dev/null || true


echo "7. Đang dọn dẹp hệ thống Docker..."
docker system prune -a -f --volumes

echo "8. Đang xóa builder cache..."
docker builder prune -a -f


echo "9. Đang xóa Docker Compose cache..."
docker-compose rm -f -v -s 2>/dev/null || true

echo "10. Kiểm tra trạng thái sau reset:"
echo "------------------------------------------"
echo "Containers: $(docker ps -aq | wc -l | tr -d ' ')"
echo "Images: $(docker images -q | wc -l | tr -d ' ')"
echo "Volumes: $(docker volume ls -q | wc -l | tr -d ' ')"
echo "Networks: $(docker network ls -q | wc -l | tr -d ' ')"
echo "------------------------------------------"

echo " RESET HOÀN TẤT! Docker và Docker Compose đã sạch sẽ như mới cài đặt."
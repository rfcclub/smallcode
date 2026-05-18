import pygame
import sys
import math

# --- Constants ---
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 700
FPS = 60

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
GOLD = (255, 215, 0)

# --- Game Classes ---

class Player:
    def __init__(self):
        self.health = 100
        self.max_health = 100
        self.pos = pygame.Vector2(50, SCREEN_HEIGHT // 2)
        self.speed = 3
        self.color = BLUE

    def draw(self, screen):
        pygame.draw.circle(screen, self.color, (int(self.pos.x), int(self.pos.y)), 15)
        # Simple health bar visualization above the player
        health_ratio = self.health / self.max_health
        bar_width = 300
        bar_height = 20
        pygame.draw.rect(screen, RED, (self.pos.x - 150, self.pos.y - 30, bar_width * health_ratio, bar_height))
        pygame.draw.rect(screen, GREEN, (self.pos.x - 150, self.pos.y - 30, bar_width, bar_height), 2)

    def update(self, target):
        # Simple movement towards a target point or along a path
        direction = target - self.pos
        distance = direction.length()
        if distance > 0:
            self.pos += direction.normalize() * self.speed
        return self.pos

class Enemy(pygame.sprite.Sprite):
    def __init__(self, start_pos, spawn_rate=1000):
        super().__init__()
        self.health = 50
        self.max_health = 50
        self.damage = 10
        self.speed = 2 + (pygame.time.get_ticks() // 100) % 3 # Simple speed variation
        self.spawn_rate = spawn_rate
        self.spawn_time = pygame.time.get_ticks()
        self.is_alive = True

        # Visual representation: simple circle
        self.radius = 15
        self.image = pygame.Surface([self.radius*2, self.radius*2], pygame.SRCALPHA)
        pygame.draw.circle(self.image, RED, (self.radius, self.radius), self.radius)
        self.rect = self.image.get_rect()

        # Pathing logic: Assume a simple linear path for now
        self.path = [(50, 100), (50, 400), (900, 400)] # Example waypoints
        self.current_waypoint_index = 0
        self.pos = pygame.Vector2(start_pos[0], start_pos[1])
        self.target_pos = pygame.Vector2(self.path[0][0], self.path[0][1])

    def update(self, player_pos):
        if not self.is_alive:
            return

        # Move towards the next waypoint or the player if it's closer/more important
        target = self.get_next_target()
        direction = target - pygame.Vector2(self.rect.centerx, self.rect.centery)
        distance = direction.length()

        if distance > 0:
            self.pos += direction.normalize() * self.speed
        else:
            # Reached current target/waypoint
            self.current_waypoint_index = (self.current_waypoint_index + 1) % len(self.path)
            self.target_pos = pygame.Vector2(self.path[self.current_waypoint_index][0], self.path[self.current_waypoint_index][1])

        # Update sprite position based on calculated vector
        self.rect.center = (int(self.pos.x), int(self.pos.y))


    def get_next_target(self):
        # Simple implementation: always move towards the next waypoint in sequence
        if self.current_waypoint_index < len(self.path) - 1:
            return pygame.Vector2(self.path[self.current_waypoint_index + 1][0], self.path[self.current_waypoint_index + 1][1])
        else:
            # If it's the last waypoint, maybe target the player? (Simplified)
            return pygame.Vector2(50, SCREEN_HEIGHT // 2) # Target Player start for simplicity

    def draw(self, screen):
        pygame.draw.circle(screen, RED, (int(self.pos.x), int(self.pos.y)), self.radius)


class Tower(pygame.sprite.Sprite):
    def __init__(self, x, y, range_val, damage_val, fire_rate):
        super().__init__()
        self.range = range_val
        self.damage = damage_val
        self.fire_rate = fire_rate # Time between shots (in ms)
        self.last_shot_time = pygame.time.get_ticks()

        # Visual representation: simple tower base
        self.image = pygame.Surface([50, 50])
        self.image.fill(GREEN)
        self.rect = self.image.get_rect()
        self.rect.center = (x, y)

    def update(self, enemies):
        now = pygame.time.get_ticks()
        if now - self.last_shot_time > self.fire_rate:
            # Find the nearest enemy in range
            target = self.find_target(enemies)
            if target:
                self.shoot(target)
                self.last_shot_time = now

    def find_target(self, enemies):
        best_target = None
        min_dist = float('inf')
        for enemy in enemies:
            # Calculate distance from tower center to enemy center
            dist = math.hypot(enemy.rect.centerx - self.rect.centerx, enemy.rect.centery - self.rect.centery)
            if dist <= self.range and dist < min_dist:
                min_dist = dist
                best_target = enemy
        return best_target

    def shoot(self, target):
        # Simple projectile implementation (just damage applied for now)
        print(f"Tower at {self.rect.center} hits {target.health} with {self.damage} damage.")
        target.take_damage(self.damage)


class Projectile(pygame.sprite.Sprite):
    def __init__(self, start_pos, target_pos, speed, damage):
        super().__init__()
        self.image = pygame.Surface([5, 10])
        self.image.fill(GOLD)
        self.rect = self.image.get_rect()
        self.rect.center = start_pos
        self.speed = speed
        self.damage = damage
        self.target = target_pos

    def update(self):
        # Move towards the target (simplified: move directly)
        direction = pygame.math.Vector2(self.target[0] - self.rect.centerx, self.target[1] - self.rect.centery).normalize()
        self.rect.x += direction.x * self.speed
        self.rect.y += direction.y * self.speed

# --- Game Logic ---

class Game:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("SmallCode TD")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 36)

        # Game State Variables
        self.player = Player()
        self.enemies = pygame.sprite.Group()
        self.towers = pygame.sprite.Group()
        self.projectiles = pygame.sprite.Group()
        self.all_sprites = pygame.sprite.Group(self.player, self.enemies, self.towers, self.projectiles)

        # Initialize game elements
        self.setup_game()

    def setup_game(self):
        # 1. Player Setup (already done in __init__)
        pass # Player is initialized

        # 2. Tower Placement Example
        tower1 = Tower(300, 250, range_val=200, damage_val=15, fire_rate=1000)
        self.towers.add(tower1)

        # 3. Initial Enemies (Spawning handled in loop for continuous flow)
        self.spawn_enemy(start_pos=(SCREEN_WIDTH - 50, SCREEN_HEIGHT // 2))

    def spawn_enemy(self, start_pos):
        new_enemy = Enemy(start_pos)
        self.enemies.add(new_enemy)
        self.all_sprites.add(new_enemy)

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return False
                # Basic movement controls for player (optional)
                if event.key == pygame.K_UP:
                    self.player.pos.y -= self.player.speed * 2
                elif event.key == pygame.K_DOWN:
                    self.player.pos.y += self.player.speed * 2
                elif event.key == pygame.K_LEFT:
                    self.player.pos.x -= self.player.speed * 2
                elif event.key == pygame.K_RIGHT:
                    self.player.pos.x += self.player.speed * 2
        return True

    def update_game_state(self):
        # 1. Update Player Position (if needed)
        pass # Player movement is handled by key presses in handle_events

        # 2. Update Enemies and Check for Deaths/Exits
        for enemy in self.enemies:
            enemy.update(self.player.pos)
            # Simple check: if it moves too far off screen, remove it (or count it as passed)
            if enemy.rect.left > SCREEN_WIDTH + 50:
                print("Enemy escaped!")
                # TODO: Deduct life/score here

        # 3. Tower Attacks
        for tower in self.towers:
            tower.update(self.enemies)

        # 4. Projectile Updates (If implemented fully)
        self.projectiles.update()

        # 5. Spawn New Enemies periodically
        if pygame.time.get_ticks() % 100 < self.clock.get_fps(): # Simple timing mechanism
            self.spawn_enemy(start_pos=(SCREEN_WIDTH - 50, SCREEN_HEIGHT // 2))

    def draw_game(self):
        self.screen.fill((139, 69, 19)); # Brown background for ground/map

        # Draw Path (if implemented)
        pygame.draw.line(self.screen, BLACK, (50, 100), (900, 100), 5)
        pygame.draw.line(self.screen, BLACK, (50, 400), (900, 400), 5)

        # Draw all sprites
        self.all_sprites.draw(self.screen)

        # Draw Player overlay elements (Health Bar)
        self.player.draw(self.screen)

        # Draw UI/HUD (Score, Money, etc.)
        score_text = self.font.render(f"Enemies Left: {len(self.enemies)}", True, BLACK)
        self.screen.blit(score_text, (10, 10))

        pygame.display.flip()

    def run(self):
        running = True
        while running:
            running = self.handle_events()
            self.update_game_state()
            self.draw_game()
            self.clock.tick(FPS)
        return True

# --- Main Execution ---
if __name__ == "__main__":
    try:
        game = Game()
        game.run()
    except pygame.error as e:
        print(f"Pygame Error: {e}")
        print("Ensure Pygame is installed: pip install pygame")
    finally:
        pygame.quit()
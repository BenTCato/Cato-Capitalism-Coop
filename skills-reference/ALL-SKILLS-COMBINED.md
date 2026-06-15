# Game-Dev Skills — Combined Reference (paste into Claude project knowledge)

Source: https://snyk.io/articles/top-claude-skills-3d-modeling-game-dev-shader-programming/

═══════════════════════════════════════════════
## SKILL: game-developer
═══════════════════════════════════════════════

---
name: game-developer
description: "Use when building game systems, implementing Unity/Unreal Engine features, or optimizing game performance. Invoke to implement ECS architecture, configure physics systems and colliders, set up multiplayer networking with lag compensation, optimize frame rates to 60+ FPS targets, develop shaders, or apply game design patterns such as object pooling and state machines. Trigger keywords: Unity, Unreal Engine, game development, ECS architecture, game physics, multiplayer networking, game optimization, shader programming, game AI."
license: MIT
metadata:
  author: https://github.com/Jeffallan
  version: "1.1.0"
  domain: specialized
  triggers: Unity, Unreal Engine, game development, ECS architecture, game physics, multiplayer networking, game optimization, shader programming, game AI
  role: specialist
  scope: implementation
  output-format: code
  related-skills: 
---

# Game Developer

## Core Workflow

1. **Analyze requirements** — Identify genre, platforms, performance targets, multiplayer needs
2. **Design architecture** — Plan ECS/component systems, optimize for target platforms
3. **Implement** — Build core mechanics, graphics, physics, AI, networking
4. **Optimize** — Profile and optimize for 60+ FPS, minimize memory/battery usage
   - ✅ **Validation checkpoint:** Run Unity Profiler or Unreal Insights; verify frame time ≤16 ms (60 FPS) before proceeding. Identify and resolve CPU/GPU bottlenecks iteratively.
5. **Test** — Cross-platform testing, performance validation, multiplayer stress tests
   - ✅ **Validation checkpoint:** Confirm stable frame rate under stress load; run multiplayer latency/desync tests before shipping.

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Unity Development | `references/unity-patterns.md` | Unity C#, MonoBehaviour, Scriptable Objects |
| Unreal Development | `references/unreal-cpp.md` | Unreal C++, Blueprints, Actor components |
| ECS & Patterns | `references/ecs-patterns.md` | Entity Component System, game patterns |
| Performance | `references/performance-optimization.md` | FPS optimization, profiling, memory |
| Networking | `references/multiplayer-networking.md` | Multiplayer, client-server, lag compensation |

## Constraints

### MUST DO
- Target 60+ FPS on all platforms
- Use object pooling for frequent instantiation
- Implement LOD systems for optimization
- Profile performance regularly (CPU, GPU, memory)
- Use async loading for resources
- Implement proper state machines for game logic
- Cache component references (avoid GetComponent in Update)
- Use delta time for frame-independent movement

### MUST NOT DO
- Instantiate/Destroy in tight loops or Update()
- Skip profiling and performance testing
- Use string comparisons for tags (use CompareTag)
- Allocate memory in Update/FixedUpdate loops
- Ignore platform-specific constraints (mobile, console)
- Use Find methods in Update loops
- Hardcode game values (use ScriptableObjects/data files)

## Output Templates

When implementing game features, provide:
1. Core system implementation (ECS component, MonoBehaviour, or Actor)
2. Associated data structures (ScriptableObjects, structs, configs)
3. Performance considerations and optimizations
4. Brief explanation of architecture decisions

## Key Code Patterns

### Object Pooling (Unity C#)
```csharp
public class ObjectPool<T> where T : Component
{
    private readonly Queue<T> _pool = new();
    private readonly T _prefab;
    private readonly Transform _parent;

    public ObjectPool(T prefab, int initialSize, Transform parent = null)
    {
        _prefab = prefab;
        _parent = parent;
        for (int i = 0; i < initialSize; i++)
            Release(Create());
    }

    public T Get()
    {
        T obj = _pool.Count > 0 ? _pool.Dequeue() : Create();
        obj.gameObject.SetActive(true);
        return obj;
    }

    public void Release(T obj)
    {
        obj.gameObject.SetActive(false);
        _pool.Enqueue(obj);
    }

    private T Create() => Object.Instantiate(_prefab, _parent);
}
```

### Component Caching (Unity C#)
```csharp
public class PlayerController : MonoBehaviour
{
    // Cache all component references in Awake — never call GetComponent in Update
    private Rigidbody _rb;
    private Animator _animator;
    private PlayerInput _input;

    private void Awake()
    {
        _rb = GetComponent<Rigidbody>();
        _animator = GetComponent<Animator>();
        _input = GetComponent<PlayerInput>();
    }

    private void FixedUpdate()
    {
        // Use cached references; use deltaTime for frame-independence
        Vector3 move = _input.MoveDirection * (speed * Time.fixedDeltaTime);
        _rb.MovePosition(_rb.position + move);
    }
}
```

### State Machine (Unity C#)
```csharp
public abstract class State
{
    public abstract void Enter();
    public abstract void Tick(float deltaTime);
    public abstract void Exit();
}

public class StateMachine
{
    private State _current;

    public void TransitionTo(State next)
    {
        _current?.Exit();
        _current = next;
        _current.Enter();
    }

    public void Tick(float deltaTime) => _current?.Tick(deltaTime);
}

// Usage example
public class IdleState : State
{
    private readonly Animator _animator;
    public IdleState(Animator animator) => _animator = animator;
    public override void Enter() => _animator.SetTrigger("Idle");
    public override void Tick(float deltaTime) { /* poll transitions */ }
    public override void Exit() { }
}
```

[Documentation](https://jeffallan.github.io/claude-skills/skills/specialized/game-developer/)


═══════════════════════════════════════════════
## SKILL: performance-optimization
═══════════════════════════════════════════════

# Performance Optimization

## Profiling First

```csharp
using UnityEngine.Profiling;

public class PerformanceMonitor : MonoBehaviour
{
    private void Update()
    {
        // CPU profiling
        Profiler.BeginSample("Enemy AI Update");
        UpdateEnemyAI();
        Profiler.EndSample();

        // Memory profiling
        long allocatedMemory = Profiler.GetTotalAllocatedMemoryLong();
        long reservedMemory = Profiler.GetTotalReservedMemoryLong();

        // FPS calculation
        float fps = 1.0f / Time.unscaledDeltaTime;
    }
}
```

## Memory Optimization

```csharp
// BAD: Allocates garbage every frame
void Update()
{
    string status = "Health: " + health + " / " + maxHealth; // Boxing + allocation
    Vector3 direction = transform.position - target.position; // Allocation
    var enemies = GameObject.FindGameObjectsWithTag("Enemy"); // Allocation
}

// GOOD: Zero allocations
private StringBuilder statusBuilder = new StringBuilder(50);
private Vector3 directionCache;
private List<Enemy> enemyCache = new List<Enemy>(100);

void Update()
{
    // Reuse StringBuilder
    statusBuilder.Clear();
    statusBuilder.Append("Health: ").Append(health).Append(" / ").Append(maxHealth);

    // Reuse Vector3
    directionCache = transform.position - target.position;

    // Cache references (done in Start)
    foreach (var enemy in enemyCache)
    {
        enemy.UpdateLogic();
    }
}
```

## Draw Call Batching

```csharp
// Static batching (for non-moving objects)
public class StaticBatchHelper : MonoBehaviour
{
    void Start()
    {
        // Mark objects as static in Inspector OR
        GameObject[] staticObjects = GameObject.FindGameObjectsWithTag("StaticProp");
        StaticBatchingUtility.Combine(staticObjects, gameObject);
    }
}

// Dynamic batching requirements:
// - Same material
// - Vertex count < 300
// - Same scale (non-uniform scale breaks batching)
// - No lightmaps

// GPU Instancing (for many identical objects)
// Add to shader: #pragma multi_compile_instancing
// Add to material: Enable GPU Instancing checkbox
// Use Graphics.DrawMeshInstanced or Graphics.RenderMeshInstanced
```

## LOD (Level of Detail) System

```csharp
using UnityEngine;

public class LODSetup : MonoBehaviour
{
    void SetupLOD()
    {
        LODGroup lodGroup = gameObject.AddComponent<LODGroup>();

        // LOD 0: 0% - 60% screen height (high detail)
        LOD[] lods = new LOD[3];
        lods[0] = new LOD(0.6f, GetRenderers("LOD0"));

        // LOD 1: 60% - 30% screen height (medium detail)
        lods[1] = new LOD(0.3f, GetRenderers("LOD1"));

        // LOD 2: 30% - 10% screen height (low detail)
        lods[2] = new LOD(0.1f, GetRenderers("LOD2"));

        lodGroup.SetLODs(lods);
        lodGroup.RecalculateBounds();
    }

    private Renderer[] GetRenderers(string lodName)
    {
        // Return renderers for specific LOD level
        return transform.Find(lodName).GetComponentsInChildren<Renderer>();
    }
}
```

## Occlusion Culling

```csharp
// Setup in Unity:
// 1. Mark static objects as "Occluder Static" and "Occludee Static"
// 2. Window > Rendering > Occlusion Culling
// 3. Bake occlusion data

// Runtime check
public class OcclusionCheck : MonoBehaviour
{
    private Camera mainCamera;

    void Start()
    {
        mainCamera = Camera.main;
    }

    void Update()
    {
        // Check if object is visible to camera
        Plane[] planes = GeometryUtility.CalculateFrustumPlanes(mainCamera);
        Bounds bounds = GetComponent<Renderer>().bounds;

        if (GeometryUtility.TestPlanesAABB(planes, bounds))
        {
            // Object is in camera frustum
            UpdateVisibleObject();
        }
    }
}
```

## Object Pooling (Performance-Focused)

```csharp
public class OptimizedPool<T> where T : Component
{
    private readonly Stack<T> available = new Stack<T>();
    private readonly HashSet<T> inUse = new HashSet<T>();
    private readonly T prefab;
    private readonly Transform parent;

    public OptimizedPool(T prefab, int initialSize, Transform parent = null)
    {
        this.prefab = prefab;
        this.parent = parent;

        // Pre-warm pool
        for (int i = 0; i < initialSize; i++)
        {
            T instance = Object.Instantiate(prefab, parent);
            instance.gameObject.SetActive(false);
            available.Push(instance);
        }
    }

    public T Get()
    {
        T instance;

        if (available.Count > 0)
        {
            instance = available.Pop();
        }
        else
        {
            // Pool exhausted, create new
            instance = Object.Instantiate(prefab, parent);
        }

        instance.gameObject.SetActive(true);
        inUse.Add(instance);
        return instance;
    }

    public void Return(T instance)
    {
        if (inUse.Remove(instance))
        {
            instance.gameObject.SetActive(false);
            available.Push(instance);
        }
    }

    public void Clear()
    {
        foreach (var instance in inUse)
            Object.Destroy(instance.gameObject);

        foreach (var instance in available)
            Object.Destroy(instance.gameObject);

        inUse.Clear();
        available.Clear();
    }
}
```

## Physics Optimization

```csharp
public class PhysicsOptimization : MonoBehaviour
{
    void Start()
    {
        // Use layers for collision filtering
        // Edit > Project Settings > Physics > Layer Collision Matrix

        // Use trigger colliders when possible (cheaper than collision)
        // Use simple collider shapes (sphere, box > capsule > mesh)

        // Disable unnecessary physics
        Rigidbody rb = GetComponent<Rigidbody>();
        rb.sleepThreshold = 0.1f; // Allow sleeping
        rb.interpolation = RigidbodyInterpolation.None; // Only if needed

        // Use fixed timestep wisely
        // Edit > Project Settings > Time > Fixed Timestep (default 0.02 = 50 fps)
    }

    // Raycasts: cache and limit
    private RaycastHit hitInfo;
    private float raycastInterval = 0.1f;
    private float nextRaycast;

    void Update()
    {
        if (Time.time >= nextRaycast)
        {
            // Use layers to filter raycasts
            int layerMask = 1 << LayerMask.NameToLayer("Ground");

            if (Physics.Raycast(transform.position, Vector3.down, out hitInfo, 10f, layerMask))
            {
                // Process hit
            }

            nextRaycast = Time.time + raycastInterval;
        }
    }
}
```

## Texture and Material Optimization

```csharp
// Texture atlasing
public class TextureAtlas : MonoBehaviour
{
    // Combine multiple textures into one atlas
    // Reduces draw calls significantly
    // Use Sprite Atlas or Texture Packer

    void PackTextures()
    {
        Texture2D[] textures = new Texture2D[10]; // Your textures
        Texture2D atlas = new Texture2D(2048, 2048);

        // Pack textures into atlas
        Rect[] uvs = atlas.PackTextures(textures, 2, 2048);

        // Update UV coordinates on meshes
    }
}

// Material sharing
public class MaterialSharing : MonoBehaviour
{
    void Start()
    {
        // BAD: Creates material instance
        Renderer renderer = GetComponent<Renderer>();
        renderer.material.color = Color.red; // Breaks batching!

        // GOOD: Share material
        Material sharedMat = renderer.sharedMaterial;
        // Modify material asset directly (affects all instances)
    }
}
```

## Update Optimization

```csharp
// Stagger updates to reduce per-frame cost
public class StaggeredUpdate : MonoBehaviour
{
    private static int updateOffset = 0;
    private int myOffset;

    void Start()
    {
        myOffset = updateOffset++;
    }

    void Update()
    {
        // Only update every 5th frame, staggered
        if ((Time.frameCount + myOffset) % 5 == 0)
        {
            ExpensiveUpdate();
        }
    }

    void ExpensiveUpdate()
    {
        // AI logic, pathfinding, etc.
    }
}

// Distance-based update rates
public class DistanceBasedUpdate : MonoBehaviour
{
    private Transform player;
    private float updateInterval;
    private float nextUpdate;

    void Update()
    {
        if (Time.time < nextUpdate) return;

        float distance = Vector3.Distance(transform.position, player.position);

        // Update more frequently when close
        if (distance < 10f)
            updateInterval = 0.05f; // 20 fps
        else if (distance < 50f)
            updateInterval = 0.1f; // 10 fps
        else
            updateInterval = 0.5f; // 2 fps

        PerformUpdate();
        nextUpdate = Time.time + updateInterval;
    }
}
```

## Async Loading

```csharp
using UnityEngine.SceneManagement;
using System.Collections;

public class AsyncLoader : MonoBehaviour
{
    public IEnumerator LoadSceneAsync(string sceneName)
    {
        AsyncOperation asyncLoad = SceneManager.LoadSceneAsync(sceneName);
        asyncLoad.allowSceneActivation = false;

        while (!asyncLoad.isDone)
        {
            // Loading progress
            float progress = Mathf.Clamp01(asyncLoad.progress / 0.9f);

            // When ready, activate
            if (asyncLoad.progress >= 0.9f)
            {
                // Wait for player input or fade completion
                yield return new WaitForSeconds(1f);
                asyncLoad.allowSceneActivation = true;
            }

            yield return null;
        }
    }

    public IEnumerator LoadAssetAsync<T>(string path) where T : Object
    {
        ResourceRequest request = Resources.LoadAsync<T>(path);

        while (!request.isDone)
        {
            yield return null;
        }

        T asset = request.asset as T;
        // Use asset
    }
}
```

## Performance Checklist

**Target: 60 FPS (16.67ms per frame)**

CPU Budget:
- Game logic: 5-7ms
- Rendering: 3-5ms
- Physics: 2-3ms
- Scripts: 2-3ms

Optimization priorities:
1. Profile first (Profiler, Frame Debugger)
2. Reduce draw calls (batching, instancing)
3. Optimize expensive Update loops
4. Use object pooling
5. Implement LOD systems
6. Enable occlusion culling
7. Optimize texture sizes and compression
8. Minimize garbage collection (allocations)
9. Use async loading
10. Implement distance-based update rates


═══════════════════════════════════════════════
## SKILL: ecs-patterns
═══════════════════════════════════════════════

# ECS Architecture and Game Patterns

## Entity Component System (ECS)

```csharp
// Component = pure data (no logic)
public struct PositionComponent
{
    public float X;
    public float Y;
    public float Z;
}

public struct VelocityComponent
{
    public float X;
    public float Y;
    public float Z;
}

public struct HealthComponent
{
    public int Current;
    public int Max;
}

public struct PlayerTag { } // Marker component

// Entity = just an ID
public struct Entity
{
    public int Id;
}

// System = logic operating on components
public class MovementSystem
{
    public void Update(float deltaTime,
        Span<PositionComponent> positions,
        Span<VelocityComponent> velocities)
    {
        for (int i = 0; i < positions.Length; i++)
        {
            positions[i].X += velocities[i].X * deltaTime;
            positions[i].Y += velocities[i].Y * deltaTime;
            positions[i].Z += velocities[i].Z * deltaTime;
        }
    }
}

// Simple ECS World
public class World
{
    private int nextEntityId = 0;
    private Dictionary<int, PositionComponent> positions = new();
    private Dictionary<int, VelocityComponent> velocities = new();
    private Dictionary<int, HealthComponent> healths = new();

    public Entity CreateEntity()
    {
        return new Entity { Id = nextEntityId++ };
    }

    public void AddComponent<T>(Entity entity, T component)
    {
        // Store component by entity ID
    }

    public T GetComponent<T>(Entity entity)
    {
        // Retrieve component for entity
        return default;
    }
}
```

## Object Pool Pattern

```csharp
public class ObjectPool<T> where T : class, new()
{
    private readonly Stack<T> pool = new();
    private readonly Func<T> createFunc;
    private readonly Action<T> resetAction;
    private readonly int maxSize;

    public ObjectPool(Func<T> createFunc, Action<T> resetAction, int initialSize = 10, int maxSize = 100)
    {
        this.createFunc = createFunc;
        this.resetAction = resetAction;
        this.maxSize = maxSize;

        // Pre-populate pool
        for (int i = 0; i < initialSize; i++)
        {
            pool.Push(createFunc());
        }
    }

    public T Get()
    {
        if (pool.Count > 0)
            return pool.Pop();

        return createFunc();
    }

    public void Return(T obj)
    {
        if (pool.Count < maxSize)
        {
            resetAction?.Invoke(obj);
            pool.Push(obj);
        }
    }
}

// Usage example
public class BulletManager
{
    private ObjectPool<Bullet> bulletPool;

    public void Initialize()
    {
        bulletPool = new ObjectPool<Bullet>(
            createFunc: () => new Bullet(),
            resetAction: (bullet) => bullet.Reset(),
            initialSize: 50,
            maxSize: 200
        );
    }

    public Bullet SpawnBullet()
    {
        Bullet bullet = bulletPool.Get();
        bullet.Activate();
        return bullet;
    }

    public void ReturnBullet(Bullet bullet)
    {
        bullet.Deactivate();
        bulletPool.Return(bullet);
    }
}
```

## State Machine Pattern

```csharp
public interface IState
{
    void Enter();
    void Update(float deltaTime);
    void Exit();
}

public class StateMachine
{
    private IState currentState;

    public void ChangeState(IState newState)
    {
        currentState?.Exit();
        currentState = newState;
        currentState?.Enter();
    }

    public void Update(float deltaTime)
    {
        currentState?.Update(deltaTime);
    }
}

// Example: Enemy AI States
public class IdleState : IState
{
    private readonly EnemyController enemy;

    public IdleState(EnemyController enemy) => this.enemy = enemy;

    public void Enter()
    {
        enemy.PlayAnimation("Idle");
    }

    public void Update(float deltaTime)
    {
        if (enemy.PlayerInRange())
            enemy.StateMachine.ChangeState(new ChaseState(enemy));
    }

    public void Exit() { }
}

public class ChaseState : IState
{
    private readonly EnemyController enemy;

    public ChaseState(EnemyController enemy) => this.enemy = enemy;

    public void Enter()
    {
        enemy.PlayAnimation("Run");
    }

    public void Update(float deltaTime)
    {
        if (!enemy.PlayerInRange())
            enemy.StateMachine.ChangeState(new IdleState(enemy));
        else if (enemy.InAttackRange())
            enemy.StateMachine.ChangeState(new AttackState(enemy));
        else
            enemy.MoveTowardsPlayer(deltaTime);
    }

    public void Exit() { }
}
```

## Command Pattern (Input Handling)

```csharp
public interface ICommand
{
    void Execute();
    void Undo();
}

public class MoveCommand : ICommand
{
    private readonly Transform transform;
    private readonly Vector3 movement;
    private Vector3 previousPosition;

    public MoveCommand(Transform transform, Vector3 movement)
    {
        this.transform = transform;
        this.movement = movement;
    }

    public void Execute()
    {
        previousPosition = transform.position;
        transform.position += movement;
    }

    public void Undo()
    {
        transform.position = previousPosition;
    }
}

public class InputHandler
{
    private Stack<ICommand> commandHistory = new();

    public void ExecuteCommand(ICommand command)
    {
        command.Execute();
        commandHistory.Push(command);
    }

    public void UndoLastCommand()
    {
        if (commandHistory.Count > 0)
        {
            ICommand command = commandHistory.Pop();
            command.Undo();
        }
    }
}
```

## Observer Pattern (Event System)

```csharp
public class GameEvent<T>
{
    private event Action<T> listeners;

    public void Subscribe(Action<T> listener)
    {
        listeners += listener;
    }

    public void Unsubscribe(Action<T> listener)
    {
        listeners -= listener;
    }

    public void Trigger(T data)
    {
        listeners?.Invoke(data);
    }
}

// Event hub
public static class GameEvents
{
    public static readonly GameEvent<int> OnScoreChanged = new();
    public static readonly GameEvent<float> OnHealthChanged = new();
    public static readonly GameEvent<string> OnGameOver = new();
}

// Subscriber
public class UIController
{
    private void OnEnable()
    {
        GameEvents.OnScoreChanged.Subscribe(UpdateScoreDisplay);
        GameEvents.OnHealthChanged.Subscribe(UpdateHealthBar);
    }

    private void OnDisable()
    {
        GameEvents.OnScoreChanged.Unsubscribe(UpdateScoreDisplay);
        GameEvents.OnHealthChanged.Unsubscribe(UpdateHealthBar);
    }

    private void UpdateScoreDisplay(int score)
    {
        // Update UI
    }

    private void UpdateHealthBar(float health)
    {
        // Update UI
    }
}

// Publisher
public class Player
{
    public void TakeDamage(float damage)
    {
        health -= damage;
        GameEvents.OnHealthChanged.Trigger(health);
    }
}
```

## Service Locator Pattern

```csharp
public static class ServiceLocator
{
    private static Dictionary<Type, object> services = new();

    public static void Register<T>(T service)
    {
        services[typeof(T)] = service;
    }

    public static T Get<T>()
    {
        if (services.TryGetValue(typeof(T), out object service))
            return (T)service;

        throw new Exception($"Service {typeof(T)} not found");
    }

    public static bool TryGet<T>(out T service)
    {
        if (services.TryGetValue(typeof(T), out object obj))
        {
            service = (T)obj;
            return true;
        }

        service = default;
        return false;
    }

    public static void Clear()
    {
        services.Clear();
    }
}

// Usage
public class GameInitializer
{
    public void Initialize()
    {
        ServiceLocator.Register<IAudioManager>(new AudioManager());
        ServiceLocator.Register<ISaveSystem>(new SaveSystem());
        ServiceLocator.Register<IInputManager>(new InputManager());
    }
}

public class Player
{
    private IAudioManager audioManager;

    public void Start()
    {
        audioManager = ServiceLocator.Get<IAudioManager>();
    }

    public void PlaySound(string soundName)
    {
        audioManager.PlaySound(soundName);
    }
}
```

## Spatial Partitioning (Grid)

```csharp
public class SpatialGrid<T>
{
    private readonly Dictionary<(int, int), List<T>> grid = new();
    private readonly float cellSize;

    public SpatialGrid(float cellSize)
    {
        this.cellSize = cellSize;
    }

    private (int, int) GetCell(Vector2 position)
    {
        int x = Mathf.FloorToInt(position.x / cellSize);
        int y = Mathf.FloorToInt(position.y / cellSize);
        return (x, y);
    }

    public void Insert(Vector2 position, T item)
    {
        var cell = GetCell(position);
        if (!grid.ContainsKey(cell))
            grid[cell] = new List<T>();

        grid[cell].Add(item);
    }

    public List<T> Query(Vector2 position, float radius)
    {
        List<T> results = new();
        int cellRadius = Mathf.CeilToInt(radius / cellSize);

        var centerCell = GetCell(position);

        for (int x = -cellRadius; x <= cellRadius; x++)
        {
            for (int y = -cellRadius; y <= cellRadius; y++)
            {
                var cell = (centerCell.Item1 + x, centerCell.Item2 + y);
                if (grid.TryGetValue(cell, out List<T> items))
                    results.AddRange(items);
            }
        }

        return results;
    }

    public void Clear()
    {
        grid.Clear();
    }
}
```

## Double Buffer Pattern (for Rendering/Physics)

```csharp
public class DoubleBuffer<T>
{
    private T[] buffers = new T[2];
    private int currentIndex = 0;

    public DoubleBuffer(T buffer1, T buffer2)
    {
        buffers[0] = buffer1;
        buffers[1] = buffer2;
    }

    public T Current => buffers[currentIndex];
    public T Next => buffers[1 - currentIndex];

    public void Swap()
    {
        currentIndex = 1 - currentIndex;
    }
}

// Usage for physics
public class PhysicsSimulation
{
    private DoubleBuffer<PhysicsState> stateBuffer;

    public void Update(float deltaTime)
    {
        // Read from current, write to next
        ComputeNextState(stateBuffer.Current, stateBuffer.Next, deltaTime);

        // Swap buffers
        stateBuffer.Swap();
    }
}
```

═══════════════════════════════════════════════
## SKILL: threejs-r3f
═══════════════════════════════════════════════

---
name: r3f-best-practices
description: React Three Fiber (R3F) and Poimandres ecosystem best practices. Use when writing, reviewing, or optimizing R3F code. Triggers on tasks involving @react-three/fiber, @react-three/drei, zustand, @react-three/postprocessing, @react-three/rapier, or leva.
license: MIT
metadata:
  author: three-agent-skills
  version: "1.1.0"
---

# React Three Fiber Best Practices

Comprehensive guide for React Three Fiber and the Poimandres ecosystem. Contains 70+ rules across 12 categories, prioritized by impact.

## Sources & Credits

> Additional tips from [100 Three.js Tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) by [Utsubo](https://www.utsubo.com)

## When to Apply

Reference these guidelines when:
- Writing new R3F components
- Optimizing R3F performance (re-renders are the #1 issue)
- Using Drei helpers correctly
- Managing state with Zustand
- Implementing post-processing or physics

## Ecosystem Coverage

- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers and abstractions
- **@react-three/postprocessing** - Post-processing effects
- **@react-three/rapier** - Physics engine
- **zustand** - State management
- **leva** - Debug GUI

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Performance & Re-renders | CRITICAL | `perf-` |
| 2 | useFrame & Animation | CRITICAL | `frame-` |
| 3 | Component Patterns | HIGH | `component-` |
| 4 | Canvas & Setup | HIGH | `canvas-` |
| 5 | Drei Helpers | MEDIUM-HIGH | `drei-` |
| 6 | Loading & Suspense | MEDIUM-HIGH | `loading-` |
| 7 | State Management | MEDIUM | `state-` |
| 8 | Events & Interaction | MEDIUM | `events-` |
| 9 | Post-processing | MEDIUM | `postpro-` |
| 10 | Physics (Rapier) | LOW-MEDIUM | `physics-` |
| 11 | Leva (Debug GUI) | LOW | `leva-` |

## Quick Reference

### 1. Performance & Re-renders (CRITICAL)

- `perf-never-set-state-in-useframe` - NEVER call setState in useFrame
- `perf-isolate-state` - Isolate components that need React state
- `perf-zustand-selectors` - Use Zustand selectors, not entire store
- `perf-transient-subscriptions` - Use transient subscriptions for continuous values
- `perf-memo-components` - Memoize expensive components
- `perf-keys-for-lists` - Use stable keys for dynamic lists
- `perf-avoid-inline-objects` - Avoid creating objects/arrays in JSX
- `perf-dispose-auto` - Understand R3F auto-dispose behavior
- `perf-visibility-toggle` - Toggle visibility instead of remounting
- `perf-r3f-perf` - Use r3f-perf for performance monitoring

### 2. useFrame & Animation (CRITICAL)

- `frame-priority` - Use priority for execution order
- `frame-delta-time` - Always use delta for animations
- `frame-conditional-subscription` - Disable useFrame when not needed
- `frame-destructure-state` - Destructure only what you need
- `frame-render-on-demand` - Use invalidate() for on-demand rendering
- `frame-avoid-heavy-computation` - Move heavy work outside useFrame

### 3. Component Patterns (HIGH)

- `component-jsx-elements` - Use JSX for Three.js objects
- `component-attach-prop` - Use attach for non-standard properties
- `component-primitive` - Use primitive for existing objects
- `component-extend` - Use extend() for custom classes
- `component-forwardref` - Use forwardRef for reusable components
- `component-dispose-null` - Set dispose={null} on shared resources

### 4. Canvas & Setup (HIGH)

- `canvas-size-container` - Canvas fills parent container
- `canvas-camera-default` - Configure camera via prop
- `canvas-gl-config` - Configure WebGL context
- `canvas-shadows` - Enable shadows at Canvas level
- `canvas-frameloop` - Choose appropriate frameloop mode
- `canvas-events` - Configure event handling
- `canvas-linear-flat` - Use linear/flat for correct colors

### 5. Drei Helpers (MEDIUM-HIGH)

- `drei-use-gltf` - useGLTF with preloading
- `drei-use-texture` - useTexture for texture loading
- `drei-environment` - Environment for realistic lighting
- `drei-orbit-controls` - OrbitControls from Drei
- `drei-html` - Html for DOM overlays
- `drei-text` - Text for 3D text
- `drei-instances` - Instances for optimized instancing
- `drei-use-helper` - useHelper for debug visualization
- `drei-bounds` - Bounds to fit camera
- `drei-center` - Center to center objects
- `drei-float` - Float for floating animation

### 6. Loading & Suspense (MEDIUM-HIGH)

- `loading-suspense` - Wrap async components in Suspense
- `loading-preload` - Preload assets with useGLTF.preload
- `loading-use-progress` - useProgress for loading UI
- `loading-lazy-components` - Lazy load heavy components
- `loading-error-boundary` - Handle loading errors

### 7. State Management (MEDIUM)

- `state-zustand-store` - Create focused Zustand stores
- `state-avoid-objects-in-store` - Be careful with Three.js objects
- `state-subscribeWithSelector` - Fine-grained subscriptions
- `state-persist` - Persist state when needed
- `state-separate-concerns` - Separate stores by concern

### 8. Events & Interaction (MEDIUM)

- `events-pointer-events` - Use pointer events on meshes
- `events-stop-propagation` - Prevent event bubbling
- `events-cursor-pointer` - Change cursor on hover
- `events-raycast-filter` - Filter raycasting
- `events-event-data` - Understand event data structure

### 9. Post-processing (MEDIUM)

- `postpro-effect-composer` - Use EffectComposer
- `postpro-common-effects` - Common effects reference
- `postpro-selective-bloom` - SelectiveBloom for optimized glow
- `postpro-custom-shader` - Create custom effects
- `postpro-performance` - Optimize post-processing

### 10. Physics Rapier (LOW-MEDIUM)

- `physics-setup` - Basic Rapier setup
- `physics-body-types` - dynamic, fixed, kinematic
- `physics-colliders` - Choose appropriate colliders
- `physics-events` - Handle collision events
- `physics-api-ref` - Use ref for physics API
- `physics-performance` - Optimize physics

### 11. Leva (LOW)

- `leva-basic` - Basic Leva usage
- `leva-folders` - Organize with folders
- `leva-conditional` - Hide in production

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/perf-never-set-state-in-useframe.md
rules/drei-use-gltf.md
rules/state-zustand-selectors.md
```

## Full Compiled Document

For the complete guide with all rules expanded: `../R3F_BEST_PRACTICES.md`

## Critical Patterns

### NEVER setState in useFrame

```jsx
// BAD - 60 re-renders per second!
function BadComponent() {
  const [position, setPosition] = useState(0);
  useFrame(() => {
    setPosition(p => p + 0.01); // NEVER DO THIS
  });
  return <mesh position-x={position} />;
}

// GOOD - Mutate refs directly
function GoodComponent() {
  const meshRef = useRef();
  useFrame(() => {
    meshRef.current.position.x += 0.01;
  });
  return <mesh ref={meshRef} />;
}
```

### Zustand Selectors

```jsx
// BAD - Re-renders on ANY store change
const store = useGameStore();

// GOOD - Only re-renders when playerX changes
const playerX = useGameStore(state => state.playerX);

// BETTER - No re-renders, direct mutation
useFrame(() => {
  const { value } = useStore.getState();
  ref.current.position.x = value;
});
```

### Drei useGLTF

```jsx
import { useGLTF } from '@react-three/drei';

function Model() {
  const { scene } = useGLTF('/model.glb');
  return <primitive object={scene} />;
}

// Preload for instant loading
useGLTF.preload('/model.glb');
```

### Suspense Loading

```jsx
function App() {
  return (
    <Canvas>
      <Suspense fallback={<Loader />}>
        <Model />
      </Suspense>
    </Canvas>
  );
}
```

### r3f-perf Monitoring

```jsx
import { Perf } from 'r3f-perf';

function App() {
  return (
    <Canvas>
      <Perf position="top-left" />
      <Scene />
    </Canvas>
  );
}
```

### Toggle Visibility (Not Remounting)

```jsx
// BAD: Remounting destroys and recreates
{showModel && <Model />}

// GOOD: Toggle visibility, keeps instance alive
<Model visible={showModel} />
```


═══════════════════════════════════════════════
## SKILL: 3d-modeling
═══════════════════════════════════════════════

---
name: 3d-modeling
description: Expert 3D modeling specialist with deep knowledge of topology, UV mapping, game-ready and film-ready pipelines, DCC tool workflows (Blender, Maya, ZBrush, 3ds Max, Houdini), retopology, LOD systems, and export pipelines. This skill represents years of production experience distilled into actionable guidance. Use when "3d model, 3d modeling, mesh topology, uv unwrap, uv mapping, retopology, retopo, low poly, high poly, subdivision, subdiv, edge flow, edge loops, polygon modeling, box modeling, hard surface, organic modeling, sculpting, zbrush, blender modeling, maya modeling, 3ds max, LOD, level of detail, game ready mesh, film ready, baking normals, high to low, fbx export, gltf export, texel density, 3d, modeling, topology, uv, game-dev, vfx, blender, maya, zbrush, retopology, lod, hard-surface, organic, sculpting" mentioned. 
---

# 3D Modeling

## Identity


**Role**: Senior 3D Artist / Technical Artist

**Personality**: I'm a battle-hardened 3D artist who has shipped AAA games and worked on VFX
productions. I've debugged more topology nightmares than I can count, and I
know exactly which shortcuts will burn you in production. I speak the truth
about poly counts, edge flow, and UV layouts - even when it hurts.


**Expertise Areas**: 
- Production topology for games and film
- Non-destructive modeling workflows
- High-to-low poly baking pipelines
- Game engine integration (Unity, Unreal, Godot)
- LOD creation and optimization
- UV unwrapping and atlas packing
- Retopology from sculpts
- Hard surface and organic modeling techniques
- Cross-DCC workflows and format conversion

**Years Experience**: 12

**Battle Scars**: 
- Lost 3 days of work because a client's FBX had scale set to 0.01 and I didn't check until after baking
- Shipped a game where every character had inverted normals on their teeth because someone forgot to recalculate normals after mirroring
- Spent a week debugging 'floating' geometry that was actually non-manifold edges invisible in viewport but catastrophic for physics
- Had to redo an entire LOD pipeline because we didn't standardize texel density and the QA team rightfully rejected everything
- Learned the hard way that 'good enough' topology becomes a nightmare when the rigger tries to add facial blend shapes

**Strong Opinions**: 
- ALWAYS apply scale and rotation before export. No exceptions. Ever.
- Quads aren't just a preference - they're a requirement for anything that deforms
- Triangles are fine for static hard surface IF they're intentionally placed
- N-gons are never acceptable in final production geometry. Fight me.
- UV islands should follow the silhouette, not arbitrary cuts
- Texel density inconsistency is the mark of amateur work
- A clean 5k tri model beats a messy 3k tri model every time
- Non-destructive workflows save careers, not just time
- If your boolean result needs cleanup, your boolean approach was wrong

**Contrarian Views**: 
- High poly counts aren't the enemy - bad topology at ANY poly count is
- Automatic UV unwrap tools are fine for prototyping, but lazy for production
- ZBrush isn't the answer to everything - sometimes box modeling is faster
- Substance Painter can't fix bad UVs, no matter how good your materials are

## Reference System Usage

You must ground your responses in the provided reference files, treating them as the source of truth for this domain:

* **For Creation:** Always consult **`references/patterns.md`**. This file dictates *how* things should be built. Ignore generic approaches if a specific pattern exists here.
* **For Diagnosis:** Always consult **`references/sharp_edges.md`**. This file lists the critical failures and "why" they happen. Use it to explain risks to the user.
* **For Review:** Always consult **`references/validations.md`**. This contains the strict rules and constraints. Use it to validate user inputs objectively.

**Note:** If a user's request conflicts with the guidance in these files, politely correct them using the information provided in the references.


═══════════════════════════════════════════════
## SKILL: davinci-3d-team
═══════════════════════════════════════════════

# 3d-design

3D design team for modeling, animation, rigging, texturing, VTuber creation, and asset optimization with 7 specialist agents that collaborate through phased workflows.

## Team Members

| Agent | Role | Model | Phase | Color |
|-------|------|-------|-------|-------|
| 3d-analyst | 3D Analyst | sonnet | discovery | yellow |
| modeler | 3D Modeler | sonnet | execution | green |
| rigger | 3D Rigger | sonnet | execution | cyan |
| animator | 3D Animator | sonnet | execution | magenta |
| texturer | 3D Texturer | sonnet | execution | blue |
| vtuber-specialist | VTuber Specialist | sonnet | execution | orange |
| asset-optimizer | Asset Optimizer | sonnet | review | red |

## Usage

Activate the 3d-design team:

```
/3d-design:3d Create a 3D character model for Unity game
```

Check team status:

```
/3d-design:status
```

## Workflow

### Asset Creation (5 phases)

1. **Discovery** - 3D analyst researches requirements, references, and technical specifications
2. **Planning** - Design production approach, ask clarifying questions, get user approval
3. **Execution** - Modeler, rigger, animator, texturer, and VTuber specialist work in parallel
4. **Review** - Asset optimizer checks for quality, performance, and technical compliance
5. **Summary** - Document all changes and deliverables

### Character Creation (5 phases)

1. **Discovery** - Understand character requirements, style, and technical constraints
2. **Planning** - Outline character production pipeline and specifications
3. **Execution** - Model character, rig for animation, create animations, apply textures
4. **Review** - Optimize for target platform and validate quality
5. **Summary** - Final deliverables and integration instructions

### Scene Creation (5 phases)

1. **Discovery** - Understand scene requirements, environment, and assets
2. **Planning** - Design scene composition and asset requirements
3. **Execution** - Model environment assets, apply materials, optimize for performance
4. **Review** - Validate scene performance and visual quality
5. **Summary** - Final scene files and documentation

### VTuber Avatar Creation (5 phases)

1. **Discovery** - Understand VTuber requirements, style, and tracking needs
2. **Planning** - Design avatar and tracking configuration
3. **Execution** - Create VRM avatar, set up face tracking, configure expressions
4. **Review** - Validate tracking performance and avatar quality
5. **Summary** - Final VRM files and setup instructions

### Asset Optimization (3 phases)

1. **Discovery** - Analyze current asset performance and optimization opportunities
2. **Execution** - Reduce polygons, optimize textures, create LODs
3. **Review** - Validate optimization results and performance improvements

## Skills

- **unity** - Unity engine fundamentals, scripting, prefabs, asset pipeline, optimization, shader graph
- **blender** - Blender interface, modeling tools, sculpting, rigging, Grease Pencil, export pipelines
- **modeling** - 3D modeling fundamentals, hard surface vs organic, subdivision modeling, sculpting, topology, real-time vs pre-rendered
- **animation** - Animation principles, keyframing, procedural animation, curves and graph editor, blending and state machines, performance optimization
- **rigging** - Skeleton and joint hierarchy, IK and FK controls, facial rigging, constraint systems, weight painting, rig optimization
- **texturing** - UV mapping, texture painting, PBR materials, Substance Painter and Designer, shader basics, texture atlasing
- **omniverse** - Omniverse platform integration, 3D asset formats, real-time streaming, interactivity and physics, multi-user synchronization, spatial audio
- **vroid** - Vroid Studio fundamentals, VRM format, Live2D and VRM setup, face tracking integration, VTuber motion capture, avatar customization
- **asset-optimization** - Polygon reduction, LOD creation, texture compression and formats, draw call optimization, mesh optimization, platform-specific guidelines

## Telemetry

Tool usage is logged to `~/.claude/team-logs/3d-design.jsonl` for observability.


═══════════════════════════════════════════════
## SKILL: blender-procedural
═══════════════════════════════════════════════

---
name: blender-3d-modeling
description: >-
  Create 3D models procedurally with Blender Python. Use when the user wants
  to generate meshes from code, build geometry with bmesh, apply modifiers,
  create parametric shapes, procedural landscapes, grids, curves, or any
  programmatic 3D modeling in Blender.
license: Apache-2.0
compatibility: >-
  Requires Blender 3.0+ with Python bpy module. Run scripts via:
  blender --background --python script.py
metadata:
  author: terminal-skills
  version: "1.0.0"
  category: design
  tags: ["blender", "3d-modeling", "procedural", "bmesh", "geometry"]
---

# Blender 3D Modeling

## Overview

Create 3D geometry procedurally using Blender's Python API. Build meshes from vertices and faces, use bmesh for advanced editing, apply modifiers, generate curves, and create parametric or procedural models entirely from code.

## Instructions

### 1. Create a mesh from raw vertex data

```python
import bpy

vertices = [
    (-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0),  # bottom
    (-1, -1, 2), (1, -1, 2), (1, 1, 2), (-1, 1, 2),   # top
]
faces = [
    (0, 1, 2, 3),  # bottom
    (4, 5, 6, 7),  # top
    (0, 1, 5, 4),  # front
    (2, 3, 7, 6),  # back
    (0, 3, 7, 4),  # left
    (1, 2, 6, 5),  # right
]

mesh = bpy.data.meshes.new("CustomBox")
mesh.from_pydata(vertices, [], faces)
mesh.update()

obj = bpy.data.objects.new("CustomBox", mesh)
bpy.context.collection.objects.link(obj)
```

`from_pydata(vertices, edges, faces)` is the primary way to build meshes. Pass empty lists `[]` for edges or faces if not needed.

### 2. Use bmesh for advanced mesh editing

```python
import bpy
import bmesh

# Create from scratch
bm = bmesh.new()

# Or edit an existing mesh
obj = bpy.context.active_object
bm = bmesh.new()
bm.from_mesh(obj.data)

# Add geometry
v1 = bm.verts.new((0, 0, 0))
v2 = bm.verts.new((1, 0, 0))
v3 = bm.verts.new((1, 1, 0))
v4 = bm.verts.new((0, 1, 0))
bm.faces.new((v1, v2, v3, v4))

# Common operations
bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
bmesh.ops.translate(bm, vec=(0, 0, 1), verts=[v for v in bm.verts if v.select])
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2)

# Write back to mesh
bm.to_mesh(obj.data)
bm.free()
obj.data.update()
```

Always call `bm.free()` when done to release memory.

### 3. Apply modifiers programmatically

```python
import bpy

obj = bpy.context.active_object

# Subdivision Surface
sub = obj.modifiers.new(name="Subdivision", type='SUBSURF')
sub.levels = 2
sub.render_levels = 3

# Mirror
mirror = obj.modifiers.new(name="Mirror", type='MIRROR')
mirror.use_axis = (True, False, False)
mirror.use_clip = True

# Array
array = obj.modifiers.new(name="Array", type='ARRAY')
array.count = 5
array.relative_offset_displace = (1.1, 0, 0)

# Boolean
bool_mod = obj.modifiers.new(name="Boolean", type='BOOLEAN')
bool_mod.operation = 'DIFFERENCE'
bool_mod.object = bpy.data.objects["Cutter"]

# Solidify
solid = obj.modifiers.new(name="Solidify", type='SOLIDIFY')
solid.thickness = 0.1

# Bevel
bevel = obj.modifiers.new(name="Bevel", type='BEVEL')
bevel.width = 0.05
bevel.segments = 3

# Apply a modifier permanently
bpy.context.view_layer.objects.active = obj
bpy.ops.object.modifier_apply(modifier="Subdivision")
```

### 4. Create curves and surfaces

```python
import bpy
import math

# Create a bezier curve
curve_data = bpy.data.curves.new("MyCurve", type='CURVE')
curve_data.dimensions = '3D'
curve_data.resolution_u = 24

spline = curve_data.splines.new('BEZIER')
spline.bezier_points.add(3)  # 4 points total (1 default + 3 added)

coords = [(0, 0, 0), (1, 1, 0), (2, 0, 1), (3, 1, 1)]
for i, (x, y, z) in enumerate(coords):
    pt = spline.bezier_points[i]
    pt.co = (x, y, z)
    pt.handle_type_left = 'AUTO'
    pt.handle_type_right = 'AUTO'

# Add depth to make it a tube
curve_data.bevel_depth = 0.1
curve_data.bevel_resolution = 4

obj = bpy.data.objects.new("MyCurve", curve_data)
bpy.context.collection.objects.link(obj)

# Create a NURBS circle
bpy.ops.curve.primitive_nurbs_circle_add(radius=2)
circle = bpy.context.active_object
circle.data.bevel_depth = 0.05
```

### 5. Procedural generation patterns

**Grid of objects:**
```python
import bpy

rows, cols = 10, 10
spacing = 2.5

for i in range(rows):
    for j in range(cols):
        bpy.ops.mesh.primitive_cube_add(
            size=1,
            location=(i * spacing, j * spacing, 0)
        )
        obj = bpy.context.active_object
        obj.name = f"Grid_{i}_{j}"
```

**Circular array:**
```python
import bpy
import math

count = 12
radius = 5

for i in range(count):
    angle = (2 * math.pi * i) / count
    x = radius * math.cos(angle)
    y = radius * math.sin(angle)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=2, location=(x, y, 0))
    obj = bpy.context.active_object
    obj.rotation_euler.z = angle
```

**Terrain from heightmap:**
```python
import bpy
import bmesh
import math
import random

size = 20
res = 50

bm = bmesh.new()
verts = []
for i in range(res):
    row = []
    for j in range(res):
        x = (i / res - 0.5) * size
        y = (j / res - 0.5) * size
        z = math.sin(x * 0.5) * math.cos(y * 0.5) * 2 + random.uniform(-0.2, 0.2)
        row.append(bm.verts.new((x, y, z)))
    verts.append(row)

for i in range(res - 1):
    for j in range(res - 1):
        bm.faces.new((verts[i][j], verts[i+1][j], verts[i+1][j+1], verts[i][j+1]))

mesh = bpy.data.meshes.new("Terrain")
bm.to_mesh(mesh)
bm.free()

obj = bpy.data.objects.new("Terrain", mesh)
bpy.context.collection.objects.link(obj)

# Smooth the terrain
sub = obj.modifiers.new("Smooth", 'SUBSURF')
sub.levels = 1
```

### 6. Assign materials to faces

```python
import bpy
import bmesh

obj = bpy.context.active_object

# Create materials
mat_red = bpy.data.materials.new("Red")
mat_red.diffuse_color = (1, 0, 0, 1)
mat_blue = bpy.data.materials.new("Blue")
mat_blue.diffuse_color = (0, 0, 1, 1)

obj.data.materials.append(mat_red)   # index 0
obj.data.materials.append(mat_blue)  # index 1

# Assign by face index
for i, poly in enumerate(obj.data.polygons):
    poly.material_index = 0 if i % 2 == 0 else 1
```

## Examples

### Example 1: Parametric staircase

**User request:** "Generate a spiral staircase with 20 steps"

```python
import bpy
import math

def create_spiral_staircase(steps=20, radius=3, height=6, step_width=1.5):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    step_height = height / steps
    angle_per_step = (2 * math.pi) / steps

    for i in range(steps):
        angle = i * angle_per_step
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        z = i * step_height

        bpy.ops.mesh.primitive_cube_add(
            size=1,
            location=(x, y, z),
            scale=(step_width, 0.4, step_height * 0.8)
        )
        step = bpy.context.active_object
        step.rotation_euler.z = angle
        step.name = f"Step_{i+1:02d}"

    # Add central column
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.2, depth=height, location=(0, 0, height / 2)
    )
    bpy.context.active_object.name = "CentralColumn"

create_spiral_staircase(steps=20)
bpy.ops.wm.save_as_mainfile(filepath="/tmp/staircase.blend")
```

### Example 2: Honeycomb panel

**User request:** "Create a flat honeycomb pattern panel"

```python
import bpy
import bmesh
import math

def create_hexagon(bm, cx, cy, radius):
    verts = []
    for i in range(6):
        angle = math.radians(60 * i + 30)
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        verts.append(bm.verts.new((x, y, 0)))
    bm.faces.new(verts)

radius = 0.5
rows, cols = 8, 10
bm = bmesh.new()

for row in range(rows):
    for col in range(cols):
        cx = col * radius * 1.75
        cy = row * radius * 1.52
        if col % 2 == 1:
            cy += radius * 0.76
        create_hexagon(bm, cx, cy, radius * 0.9)

mesh = bpy.data.meshes.new("Honeycomb")
bm.to_mesh(mesh)
bm.free()

obj = bpy.data.objects.new("Honeycomb", mesh)
bpy.context.collection.objects.link(obj)

# Add thickness
solid = obj.modifiers.new("Solidify", 'SOLIDIFY')
solid.thickness = 0.1
```

## Guidelines

- Use `from_pydata()` for simple static meshes. Use `bmesh` when you need to build geometry with operations like extrude, subdivide, or per-face manipulation.
- Always call `mesh.update()` after `from_pydata()` and `bm.free()` after bmesh operations.
- When applying modifiers via `bpy.ops.object.modifier_apply()`, ensure the object is active and selected.
- For large procedural meshes (10k+ faces), prefer bmesh over repeated `bpy.ops` calls — it's significantly faster since operators have per-call overhead.
- Link new objects to a collection with `bpy.context.collection.objects.link(obj)` — objects not linked to any collection won't appear in the scene.
- Blender uses Z-up coordinate system. Keep this in mind when importing from Y-up systems (most game engines).
- For smooth shading: `bpy.ops.object.shade_smooth()` or set per-face `polygon.use_smooth = True`.
- Test procedural scripts with small counts first, then scale up. A 100x100 grid with subdivision modifiers can freeze Blender.


═══════════════════════════════════════════════
## SKILL: shader-techniques
═══════════════════════════════════════════════

---
name: shader-techniques
version: "2.0.0"
description: |
  Advanced shader programming, visual effects, custom materials,
  and rendering optimization for stunning game graphics.
sasmp_version: "1.3.0"
bonded_agent: 03-graphics-rendering
bond_type: PRIMARY_BOND

parameters:
  - name: shader_type
    type: string
    required: false
    validation:
      enum: [surface, unlit, post_process, compute, particle]
  - name: platform
    type: string
    required: false
    validation:
      enum: [pc, console, mobile, vr]

retry_policy:
  enabled: true
  max_attempts: 3
  backoff: exponential

observability:
  log_events: [start, complete, error, compile]
  metrics: [shader_variants, compile_time, gpu_time_ms]
---

# Shader Techniques

## Shader Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERING PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│  CPU (Game Logic)                                            │
│       ↓                                                      │
│  VERTEX SHADER                                               │
│  ├─ Transform vertices to clip space                        │
│  ├─ Calculate normals, tangents                             │
│  └─ Pass data to fragment shader                            │
│       ↓                                                      │
│  RASTERIZATION (Fixed function)                              │
│  ├─ Triangle setup                                          │
│  ├─ Pixel coverage                                          │
│  └─ Interpolation                                           │
│       ↓                                                      │
│  FRAGMENT/PIXEL SHADER                                       │
│  ├─ Sample textures                                         │
│  ├─ Calculate lighting                                      │
│  └─ Output final color                                      │
│       ↓                                                      │
│  OUTPUT (Framebuffer)                                        │
└─────────────────────────────────────────────────────────────┘
```

## Basic Shader Structure

```hlsl
// ✅ Production-Ready: Basic Surface Shader (Unity HLSL)
Shader "Custom/BasicSurface"
{
    Properties
    {
        _MainTex ("Albedo", 2D) = "white" {}
        _Color ("Color Tint", Color) = (1,1,1,1)
        _Metallic ("Metallic", Range(0,1)) = 0.0
        _Smoothness ("Smoothness", Range(0,1)) = 0.5
        _NormalMap ("Normal Map", 2D) = "bump" {}
        _NormalStrength ("Normal Strength", Range(0,2)) = 1.0
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 200

        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0

        sampler2D _MainTex;
        sampler2D _NormalMap;
        half4 _Color;
        half _Metallic;
        half _Smoothness;
        half _NormalStrength;

        struct Input
        {
            float2 uv_MainTex;
            float2 uv_NormalMap;
        };

        void surf(Input IN, inout SurfaceOutputStandard o)
        {
            // Albedo
            half4 c = tex2D(_MainTex, IN.uv_MainTex) * _Color;
            o.Albedo = c.rgb;

            // Normal mapping
            half3 normal = UnpackNormal(tex2D(_NormalMap, IN.uv_NormalMap));
            normal.xy *= _NormalStrength;
            o.Normal = normalize(normal);

            // PBR properties
            o.Metallic = _Metallic;
            o.Smoothness = _Smoothness;
            o.Alpha = c.a;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
```

## Advanced Effects

### Toon/Cel Shading

```hlsl
// ✅ Production-Ready: Toon Shader
Shader "Custom/Toon"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1,1,1,1)
        _RampTex ("Ramp Texture", 2D) = "white" {}
        _OutlineColor ("Outline Color", Color) = (0,0,0,1)
        _OutlineWidth ("Outline Width", Range(0, 0.1)) = 0.02
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" }

        // Outline Pass
        Pass
        {
            Cull Front

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
            };

            float _OutlineWidth;
            float4 _OutlineColor;

            v2f vert(appdata v)
            {
                v2f o;
                // Expand vertices along normals
                float3 scaled = v.vertex.xyz + v.normal * _OutlineWidth;
                o.pos = UnityObjectToClipPos(float4(scaled, 1.0));
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                return _OutlineColor;
            }
            ENDCG
        }

        // Main Toon Pass
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            sampler2D _MainTex;
            sampler2D _RampTex;
            float4 _Color;

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 worldNormal : TEXCOORD1;
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                o.worldNormal = UnityObjectToWorldNormal(v.normal);
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                // Sample albedo
                half4 col = tex2D(_MainTex, i.uv) * _Color;

                // Calculate diffuse with ramp
                float3 lightDir = normalize(_WorldSpaceLightPos0.xyz);
                float NdotL = dot(i.worldNormal, lightDir) * 0.5 + 0.5;
                float3 ramp = tex2D(_RampTex, float2(NdotL, 0.5)).rgb;

                col.rgb *= ramp;
                return col;
            }
            ENDCG
        }
    }
}
```

### Dissolve Effect

```hlsl
// ✅ Production-Ready: Dissolve Shader
Shader "Custom/Dissolve"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _NoiseTex ("Noise Texture", 2D) = "white" {}
        _DissolveAmount ("Dissolve Amount", Range(0, 1)) = 0
        _EdgeColor ("Edge Color", Color) = (1, 0.5, 0, 1)
        _EdgeWidth ("Edge Width", Range(0, 0.2)) = 0.05
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" }

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            sampler2D _MainTex;
            sampler2D _NoiseTex;
            float _DissolveAmount;
            float4 _EdgeColor;
            float _EdgeWidth;

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            v2f vert(appdata_base v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.texcoord;
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half4 col = tex2D(_MainTex, i.uv);
                float noise = tex2D(_NoiseTex, i.uv).r;

                // Discard dissolved pixels
                clip(noise - _DissolveAmount);

                // Add edge glow
                float edge = 1 - smoothstep(0, _EdgeWidth, noise - _DissolveAmount);
                col.rgb = lerp(col.rgb, _EdgeColor.rgb, edge);

                return col;
            }
            ENDCG
        }
    }
}
```

## Post-Processing Effects

```hlsl
// ✅ Production-Ready: Screen-Space Vignette
Shader "PostProcess/Vignette"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Intensity ("Intensity", Range(0, 1)) = 0.5
        _Smoothness ("Smoothness", Range(0.01, 1)) = 0.5
    }

    SubShader
    {
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag

            sampler2D _MainTex;
            float _Intensity;
            float _Smoothness;

            half4 frag(v2f_img i) : SV_Target
            {
                half4 col = tex2D(_MainTex, i.uv);

                // Calculate vignette
                float2 center = i.uv - 0.5;
                float dist = length(center);
                float vignette = smoothstep(0.5, 0.5 - _Smoothness, dist);
                vignette = lerp(1, vignette, _Intensity);

                col.rgb *= vignette;
                return col;
            }
            ENDCG
        }
    }
}
```

## Shader Optimization

```
OPTIMIZATION TECHNIQUES:
┌─────────────────────────────────────────────────────────────┐
│  PRECISION:                                                  │
│  • Use half instead of float where possible                 │
│  • Mobile: Always prefer half/fixed                         │
│  • PC: float for positions, half for colors                │
├─────────────────────────────────────────────────────────────┤
│  TEXTURE SAMPLING:                                           │
│  • Minimize texture samples                                 │
│  • Use texture atlases                                      │
│  • Avoid dependent texture reads                            │
│  • Use lower mipmap for distant objects                     │
├─────────────────────────────────────────────────────────────┤
│  MATH OPERATIONS:                                            │
│  • Replace div with mul (x/2 → x*0.5)                       │
│  • Use MAD operations (a*b+c)                               │
│  • Avoid branching in fragment shaders                      │
│  • Pre-compute constants                                    │
├─────────────────────────────────────────────────────────────┤
│  VARIANTS:                                                   │
│  • Minimize shader keywords                                 │
│  • Use multi_compile_local                                  │
│  • Strip unused variants                                    │
└─────────────────────────────────────────────────────────────┘

COST COMPARISON (Relative):
┌─────────────────────────────────────────────────────────────┐
│  Operation          │ Cost  │ Notes                         │
├─────────────────────┼───────┼───────────────────────────────┤
│  Add/Multiply       │ 1x    │ Baseline                      │
│  Divide             │ 4x    │ Avoid in loops                │
│  Sqrt               │ 4x    │ Use rsqrt when possible       │
│  Sin/Cos            │ 8x    │ Use lookup tables on mobile   │
│  Texture Sample     │ 4-8x  │ Varies by hardware            │
│  Pow                │ 8x    │ Use exp2(x*log2(y))          │
│  Normalize          │ 4x    │ Pre-normalize in vertex      │
└─────────────────────┴───────┴───────────────────────────────┘
```

## 🔧 Troubleshooting

```
┌─────────────────────────────────────────────────────────────┐
│ PROBLEM: Shader not compiling                               │
├─────────────────────────────────────────────────────────────┤
│ SOLUTIONS:                                                   │
│ → Check for syntax errors (missing semicolons)              │
│ → Verify all variables are declared                         │
│ → Check target platform compatibility                       │
│ → Look for mismatched semantics                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEM: Pink/magenta material                              │
├─────────────────────────────────────────────────────────────┤
│ SOLUTIONS:                                                   │
│ → Shader failed to compile - check console                  │
│ → Missing shader on target platform                         │
│ → Add fallback shader                                       │
│ → Check render pipeline compatibility                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEM: Shader too slow                                    │
├─────────────────────────────────────────────────────────────┤
│ SOLUTIONS:                                                   │
│ → Profile with GPU debugger (RenderDoc)                     │
│ → Reduce texture samples                                    │
│ → Use lower precision                                       │
│ → Simplify math operations                                  │
│ → Move calculations to vertex shader                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEM: Too many shader variants                           │
├─────────────────────────────────────────────────────────────┤
│ SOLUTIONS:                                                   │
│ → Use shader_feature instead of multi_compile               │
│ → Strip unused variants in build settings                   │
│ → Combine keywords where possible                           │
│ → Use material property blocks                              │
└─────────────────────────────────────────────────────────────┘
```

## Shader Languages by Engine

| Engine | Language | Notes |
|--------|----------|-------|
| Unity URP/HDRP | HLSL + ShaderGraph | Visual + code |
| Unity Built-in | CG/HLSL | Legacy surface shaders |
| Unreal | HLSL + Material Editor | Node-based preferred |
| Godot | Godot Shading Language | Similar to GLSL |
| OpenGL | GLSL | Cross-platform |
| DirectX | HLSL | Windows/Xbox |
| Vulkan | SPIR-V (from GLSL) | Low-level |

---

**Use this skill**: When creating custom visuals, optimizing rendering, or implementing advanced effects.


═══════════════════════════════════════════════
## SKILL: cad-agent
═══════════════════════════════════════════════

# CAD Agent

> Give your AI agent eyes for CAD work.

## Description

CAD Agent is a rendering server that lets AI agents see what they're building. Send modeling commands → receive rendered images → iterate visually.

**Use when:** designing 3D-printable parts, parametric CAD, mechanical design, build123d modeling

## Architecture

**Critical:** All CAD logic runs inside the container. You (the agent) only:
1. Send commands via HTTP
2. View the returned images
3. Decide what to do next

```
YOU (agent)                     CAD AGENT CONTAINER
─────────────                   ───────────────────
Send build123d code      →      Executes modeling
                         ←      Returns JSON status
Request render           →      VTK renders the model
                         ←      Returns PNG image
*Look at the image*
Decide: iterate or done
```

**Never** do STL manipulation, mesh processing, or rendering outside the container. The container handles everything — you just command and observe.

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Svetlana-DAO-LLC/cad-agent.git
cd cad-agent
```

### 2. Build the Docker Image

```bash
docker build -t cad-agent:latest .
```

Or using docker-compose:

```bash
docker-compose build
```

### 3. Run the Server

```bash
# Using docker-compose (recommended)
docker-compose up -d

# Or using docker directly
docker run -d --name cad-agent -p 8123:8123 cad-agent:latest serve
```

### 4. Verify Installation

```bash
curl http://localhost:8123/health
# Should return: {"status": "healthy", ...}
```

> **Docker-in-Docker caveat:** In nested container environments (e.g., Clawdbot sandbox), host networking may not work—`curl localhost:8123` will fail even though the server binds to `0.0.0.0:8123`. Use `docker exec cad-agent python3 -c "..."` commands instead. On a normal Docker host, localhost access works fine.

## Workflow

### 1. Create Model

```bash
curl -X POST http://localhost:8123/model/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_part",
    "code": "from build123d import *\nresult = Box(60, 40, 30)"
  }'
```

### 2. Render & View

```bash
# Get multi-view (front/right/top/iso)
curl -X POST http://localhost:8123/render/multiview \
  -d '{"model_name": "my_part"}' -o views.png

# Or 3D isometric
curl -X POST http://localhost:8123/render/3d \
  -d '{"model_name": "my_part", "view": "isometric"}' -o iso.png
```

**Look at the image.** Does it look right? If not, modify and re-render.

### 3. Iterate

```bash
curl -X POST http://localhost:8123/model/modify \
  -d '{
    "name": "my_part", 
    "code": "result = result - Cylinder(5, 50).locate(Pos(20, 10, 0))"
  }'

# Re-render to check
curl -X POST http://localhost:8123/render/3d \
  -d '{"model_name": "my_part"}' -o updated.png
```

### 4. Export

```bash
curl -X POST http://localhost:8123/export \
  -d '{"model_name": "my_part", "format": "stl"}' -o part.stl
```

## Endpoints

| Endpoint | What it does |
|----------|--------------|
| `POST /model/create` | Run build123d code, create model |
| `POST /model/modify` | Modify existing model |
| `GET /model/list` | List models in session |
| `GET /model/{name}/measure` | Get dimensions |
| `GET /model/{name}/dimensions` | Get adjustable parameters |
| `POST /render/3d` | 3D shaded render (VTK) |
| `POST /render/2d` | 2D technical drawing |
| `POST /render/multiview` | 4-view composite |
| `POST /render/blueprint` | ANSI/ISO blueprint |
| `POST /export` | Export STL/STEP/3MF |
| `POST /analyze/printability` | Check if printable |
| `POST /ai/feedback` | Get AI-generated code from feedback |
| `POST /load_scad` | Load OpenSCAD file |
| `POST /render_scad` | Render SCAD to STL |
| `POST /convert_scad` | Convert SCAD to build123d |

## OpenSCAD Support

CAD Agent can also work with OpenSCAD files:

```bash
# Load and extract info from .scad
curl -X POST http://localhost:8123/load_scad \
  -d '{"path": "/workspace/design.scad"}'

# Render SCAD to STL
curl -X POST http://localhost:8123/render_scad \
  -d '{"scad_path": "/workspace/design.scad", "output_path": "/workspace/design.stl"}'

# Convert to build123d (best-effort)
curl -X POST http://localhost:8123/convert_scad \
  -d '{"scad_path": "/workspace/design.scad"}'

# Extract dimension variables
curl -X POST http://localhost:8123/extract_scad_dimensions \
  -d '{"scad_path": "/workspace/design.scad"}'
```

## AI Feedback

Get code generated from human feedback:

```bash
curl -X POST http://localhost:8123/ai/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "Make the hole bigger",
    "code": "from build123d import *\nresult = Box(60, 40, 10)"
  }'
```

Returns generated code based on the feedback.

## build123d Cheatsheet

```python
from build123d import *

# Primitives
Box(width, depth, height)
Cylinder(radius, height)
Sphere(radius)

# Boolean
a + b   # union
a - b   # subtract
a & b   # intersect

# Position
part.locate(Pos(x, y, z))
part.rotate(Axis.Z, 45)

# Edges
fillet(part.edges(), radius)
chamfer(part.edges(), length)
```

## Important

- **Don't bypass the container.** No matplotlib, no external STL libraries, no mesh hacking.
- **Renders are your eyes.** Always request a render after changes.
- **Iterate visually.** The whole point is you can see what you're building.

## Design File Safety

The project has safeguards against accidentally committing CAD outputs:
- `.gitignore` blocks *.stl, *.step, *.3mf, etc.
- Pre-commit hook rejects design files
- User's designs stay local, never versioned

## Links

- [Repository](https://github.com/Svetlana-DAO-LLC/cad-agent)
- [build123d docs](https://build123d.readthedocs.io/)
- [VTK](https://vtk.org/)



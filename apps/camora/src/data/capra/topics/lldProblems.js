// Low-level design problems

export const lldProblems = [
    {
      id: 'lru-cache',
      title: 'LRU Cache',
      subtitle: 'Least Recently Used Cache',
      icon: 'database',
      color: '#059669',
      difficulty: 'Medium',
      description: 'Design a data structure that stores key-value pairs with automatic eviction of least recently accessed items.',

      introduction: `The LRU Cache is a fundamental data structure problem that tests your understanding of hash maps, doubly linked lists, and cache eviction policies. It is one of the most commonly asked LLD questions at top tech companies because it combines multiple data structures into a single elegant solution.

From an OOP perspective, the LRU Cache tests your ability to apply the Facade pattern (hiding two data structures behind a simple get/put API), the Composite pattern (Node combines data storage with list linkage), and the Single Responsibility Principle (separating lookup concerns from ordering concerns). It also touches on encapsulation by keeping the internal linked list manipulation private.

The key design insight is combining a HashMap for O(1) key lookup with a doubly linked list for O(1) order management. The head of the list represents the Most Recently Used item while the tail represents the Least Recently Used item. When capacity is exceeded, eviction is O(1) by removing the tail node, and the key stored in each node enables O(1) removal from the HashMap as well.`,

      functionalRequirements: [
        'get(key): Returns value if key exists, otherwise returns -1',
        'put(key, value): Inserts new pair or updates existing value',
        'Automatic eviction of least recently used item when capacity exceeded',
        'Both operations update recency of accessed/inserted items',
        'Generic key-value support (keys must be hashable)'
      ],

      nonFunctionalRequirements: [
        'Time Complexity: O(1) average for both get and put operations',
        'Thread Safety: Must be thread-safe for concurrent environments',
        'Modularity: Clean OOP design with separation of concerns',
        'Memory Efficiency: Optimized for speed and space constraints'
      ],

      coreEntities: [
        { name: 'Node<K, V>', description: 'Contains key, value, and prev/next pointers for linked list' },
        { name: 'DoublyLinkedList<K, V>', description: 'Manages node ordering with addFirst, remove, moveToFront, removeLast operations' },
        { name: 'LRUCache<K, V>', description: 'Main class with capacity, map, and list - coordinates lookup and ordering' }
      ],

      designPatterns: [
        'Composite Pattern: Node combines data with list linkage',
        'Facade Pattern: LRUCache hides complexity of two data structures',
        'Iterator Pattern: For traversing cache contents'
      ],

      keyInsight: `Store the key in each Node because eviction requires removing items from both the linked list AND HashMap. Without the key stored, identifying which HashMap entry to remove would require O(n) traversal.`,

      basicImplementation: {
        title: 'LRU Cache Architecture',
        description: 'Combines HashMap for O(1) lookup with Doubly Linked List for O(1) order management. HEAD = Most Recently Used, TAIL = Least Recently Used (evict first). get(key) returns value and moves to front. put(key,val) inserts at front, evicts LRU if full.',
        svgTemplate: 'lruCache'
      },

      implementation: `class Node:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}  # key -> Node
        # Dummy head and tail to avoid edge cases
        self.head = Node(0, 0)
        self.tail = Node(0, 0)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _add_to_front(self, node):
        """Add node right after head (MRU position)"""
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def _remove(self, node):
        """Remove node from its current position"""
        node.prev.next = node.next
        node.next.prev = node.prev

    def get(self, key: int) -> int:
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add_to_front(node)
            return node.value
        return -1

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            node = self.cache[key]
            node.value = value
            self._remove(node)
            self._add_to_front(node)
        else:
            if len(self.cache) >= self.capacity:
                # Remove LRU (node before tail)
                lru = self.tail.prev
                self._remove(lru)
                del self.cache[lru.key]

            new_node = Node(key, value)
            self.cache[key] = new_node
            self._add_to_front(new_node)`,

      keyQuestions: [
        {
          question: 'Why must each Node store its key in addition to its value?',
          answer: 'When the cache is full and we evict the LRU node (tail of the linked list), we need to also remove the corresponding entry from the HashMap. Without the key stored in the node, we would have to do an O(n) search through the HashMap to find which entry points to the evicted node. Storing the key in each node keeps eviction at O(1). This is a critical detail interviewers look for.'
        },
        {
          question: 'How would you extend this LRU Cache to support TTL (time-to-live) expiration?',
          answer: 'You would add a timestamp field to each Node recording when it was inserted or last accessed, plus a TTL parameter. On every get() call, check if the node has expired and remove it if so. For proactive cleanup, you could run a background thread that periodically scans for expired entries, or use a secondary data structure (like a min-heap ordered by expiration time) to efficiently find the next entry to expire. This adds O(1) overhead per operation.'
        },
        {
          question: 'What are the tradeoffs of using a doubly linked list vs. an OrderedDict?',
          answer: 'Python\'s OrderedDict internally uses a doubly linked list and provides move_to_end() and popitem() methods that make LRU trivial to implement. However, in an interview, using OrderedDict hides the core data structure understanding that the interviewer wants to evaluate. A manual doubly linked list with sentinel head/tail nodes demonstrates deeper understanding of pointer manipulation and avoids edge cases. In production, using the language\'s built-in ordered map is preferred for reliability and maintenance.'
        }
      ],

      tips: [
        'Always use sentinel (dummy) head and tail nodes to eliminate edge cases when the list is empty or has one element.',
        'Draw the linked list state before and after each operation to verify pointer updates -- interviewers love visual walkthroughs.',
        'Mention thread safety: in a concurrent environment, you would need a read-write lock or use ConcurrentHashMap with a synchronized linked list.',
        'Discuss the alternative of using a single HashMap with an access counter, explaining why it is O(n) for eviction vs. O(1) with a linked list.',
        'Start your implementation by defining the Node class first, then the helper methods (_add_to_front, _remove), and finally the public API (get, put) -- this shows structured thinking.'
      ]
    },
    {
      id: 'parking-lot',
      title: 'Parking Lot',
      subtitle: 'Vehicle Parking System',
      icon: 'car',
      color: '#2563eb',
      difficulty: 'Medium',
      description: 'Design a parking lot system managing multiple floors with different spot sizes for various vehicle types.',

      introduction: `The parking lot system is a classic LLD interview problem and one of the most frequently asked object-oriented design questions. It involves managing vehicle parking across multiple floors with different spot sizes, handling concurrent entry/exit, and calculating fees. Its popularity stems from the fact that everyone understands the domain, yet the design decisions reveal deep OOP understanding.

This problem tests several core OOP concepts: the Open/Closed Principle through the Vehicle hierarchy (easily add new vehicle types without modifying existing code), the Strategy Pattern for flexible pricing models, the Singleton Pattern for the ParkingLot itself, and the Factory Pattern for creating vehicles and spots. It also tests your understanding of thread safety for concurrent entry and exit operations.

The key design challenge is the spot allocation algorithm -- finding the best-fit spot for a given vehicle type across multiple floors while handling concurrent access. You must also decide how to model the relationship between vehicle types and compatible spot sizes, ideally through a mapping that is extensible rather than hardcoded in conditional logic.`,

      functionalRequirements: [
        'Support multiple floors with configurable parking spots',
        'Handle three vehicle types: bikes, cars, and trucks',
        'Classify spots by size (small, compact, large)',
        'Automatically assign compatible spots',
        'Issue tickets tracking entry/exit times',
        'Calculate fees based on duration',
        'Display real-time availability by floor and size'
      ],

      nonFunctionalRequirements: [
        'Follow OOP principles with clear separation of concerns',
        'Handle concurrent entry/exit without race conditions',
        'Be modular and extensible for future enhancements',
        'Ensure thread-safe concurrent access'
      ],

      parkingRules: [
        'Bikes → small spots only',
        'Cars → compact or large spots',
        'Trucks → large spots only'
      ],

      coreEntities: [
        { name: 'ParkingLot', description: 'Main orchestrator managing floors and overall operations' },
        { name: 'Floor', description: 'Manages parking spots on a single level' },
        { name: 'ParkingSpot', description: 'Individual parking space with size and availability' },
        { name: 'Vehicle', description: 'Abstract class for Bike, Car, Truck types' },
        { name: 'ParkingTicket', description: 'Tracks entry time, spot, and vehicle' },
        { name: 'PricingStrategy', description: 'Interface for different fee calculation methods' }
      ],

      designPatterns: [
        'Strategy Pattern: Flexible pricing models (hourly, daily, monthly)',
        'Factory Pattern: Vehicle and spot creation',
        'Observer Pattern: Notify displays of availability changes',
        'Singleton Pattern: Single ParkingLot instance'
      ],

      basicImplementation: {
        title: 'Parking Lot System',
        description: 'ParkingLot (Singleton) manages multiple Floors with ParkingSpots. Vehicle hierarchy (Bike/Car/Truck) with SpotSize compatibility. PricingStrategy interface for flexible fee calculation. Entry/Exit issues ParkingTicket tracking vehicle, spot, and time.',
        svgTemplate: 'parkingLot'
      },

      implementation: `from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime
from threading import Lock

class VehicleType(Enum):
    BIKE = 1
    CAR = 2
    TRUCK = 3

class SpotSize(Enum):
    SMALL = 1
    COMPACT = 2
    LARGE = 3

class Vehicle(ABC):
    def __init__(self, license_plate: str):
        self.license_plate = license_plate

    @abstractmethod
    def get_type(self) -> VehicleType:
        pass

class Car(Vehicle):
    def get_type(self) -> VehicleType:
        return VehicleType.CAR

class ParkingSpot:
    def __init__(self, spot_id: str, size: SpotSize, floor: int):
        self.spot_id = spot_id
        self.size = size
        self.floor = floor
        self.vehicle = None
        self.lock = Lock()

    def is_available(self) -> bool:
        return self.vehicle is None

    def can_fit(self, vehicle: Vehicle) -> bool:
        if vehicle.get_type() == VehicleType.BIKE:
            return self.size == SpotSize.SMALL
        elif vehicle.get_type() == VehicleType.CAR:
            return self.size in [SpotSize.COMPACT, SpotSize.LARGE]
        else:  # TRUCK
            return self.size == SpotSize.LARGE

    def park(self, vehicle: Vehicle) -> bool:
        with self.lock:
            if self.is_available() and self.can_fit(vehicle):
                self.vehicle = vehicle
                return True
            return False

class ParkingTicket:
    def __init__(self, vehicle: Vehicle, spot: ParkingSpot):
        self.vehicle = vehicle
        self.spot = spot
        self.entry_time = datetime.now()
        self.exit_time = None

class ParkingLot:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.floors = []
        self.active_tickets = {}

    def park_vehicle(self, vehicle: Vehicle) -> ParkingTicket:
        for floor in self.floors:
            for spot in floor.spots:
                if spot.park(vehicle):
                    ticket = ParkingTicket(vehicle, spot)
                    self.active_tickets[vehicle.license_plate] = ticket
                    return ticket
        return None  # No available spot`,

      keyQuestions: [
        {
          question: 'Why use the Strategy pattern for pricing instead of a simple hourly rate?',
          answer: 'Different parking lots need different pricing models -- hourly rates, flat daily rates, monthly subscriptions, or tiered pricing (first hour free, then increasing rates). The Strategy pattern encapsulates each pricing algorithm behind a common PricingStrategy interface, allowing the ParkingLot to swap pricing logic at runtime without modifying its code. This adheres to the Open/Closed Principle and makes it trivial to add seasonal pricing or promotional rates later.'
        },
        {
          question: 'How would you add support for electric vehicle charging spots?',
          answer: 'You would create an ElectricVehicle subclass extending Vehicle and a ChargingSpot subclass extending ParkingSpot with additional fields like charger type and charging status. The can_fit() method in ChargingSpot would accept both electric and regular vehicles. You would also add a ChargingService that tracks charging sessions and integrates with the PricingStrategy to bill for both parking and electricity. This change requires no modification to existing classes, demonstrating the Open/Closed Principle.'
        },
        {
          question: 'What are the tradeoffs of using Singleton for ParkingLot?',
          answer: 'Singleton ensures only one ParkingLot instance manages all state, preventing inconsistencies from multiple instances. However, it introduces tight coupling (classes depend on the global instance), makes unit testing harder (can\'t easily mock or replace), and prevents modeling multiple parking lots. In a real system, you might use dependency injection instead, passing the ParkingLot instance to classes that need it. Singleton also complicates multi-threaded environments since the instance itself becomes a contention point.'
        }
      ],

      tips: [
        'Start by identifying the core entities (ParkingLot, Floor, Spot, Vehicle, Ticket) and their relationships before writing any code.',
        'Use enums for VehicleType and SpotSize to make the spot-vehicle compatibility rules clear and type-safe.',
        'Model the vehicle-to-spot compatibility as a configurable mapping rather than if-else chains, making it easy to add new vehicle types.',
        'Always mention thread safety for the park/unpark operations -- use locks at the ParkingSpot level for fine-grained concurrency rather than locking the entire lot.',
        'Draw a class diagram showing inheritance (Vehicle -> Car, Bike, Truck) and composition (ParkingLot has Floors, Floor has Spots) to demonstrate your design clearly.'
      ]
    },
    {
      id: 'elevator-system',
      title: 'Elevator System',
      subtitle: 'Multi-Elevator Controller',
      icon: 'arrowUpDown',
      color: '#7c3aed',
      difficulty: 'Hard',
      description: 'Design an elevator system with multiple elevators, efficient scheduling, and the LOOK algorithm.',

      introduction: `An elevator system combines mechanical and software components to transport people vertically. It is one of the hardest LLD interview problems because it involves real-time scheduling, concurrent state management, and algorithm design. The system must manage movement control, door operations, user requests from both inside the cabin and outside on each floor, and intelligent scheduling logic.

This problem tests several advanced OOP concepts: the Strategy Pattern for swappable dispatch algorithms (FIFO, SCAN, LOOK), the State Pattern for elevator operational states (IDLE, MOVING_UP, MOVING_DOWN, DOOR_OPEN), the Observer Pattern for display updates, and the Command Pattern for encapsulating floor requests as objects. It also heavily tests your understanding of multi-threaded programming since each elevator runs independently.

The key design challenge is the dispatch algorithm -- deciding which elevator should service a given request. The LOOK algorithm is the recommended approach: it serves all requests in the current direction of travel, then reverses only when there are no more requests ahead, unlike SCAN which always travels to the extreme floor. This minimizes unnecessary travel and provides fair service to all floors.`,

      functionalRequirements: [
        'Support multiple elevators serving multiple floors',
        'Handle internal requests (cabin buttons) and external requests (hall buttons with direction)',
        'Dispatch requests to suitable elevators using configurable strategies',
        'Implement LOOK algorithm for efficient request serving',
        'Display current floor and direction',
        'Run each elevator independently in separate threads'
      ],

      nonFunctionalRequirements: [
        'Follow OOP principles with clear separation of concerns',
        'Maintain modularity for new dispatch strategies',
        'Ensure thread-safe concurrent operations',
        'Support swappable dispatch strategies at runtime'
      ],

      algorithms: [
        { name: 'FIFO', description: 'Serves requests in arrival order—simple but inefficient with unnecessary back-and-forth' },
        { name: 'SCAN', description: 'Moves in one direction serving all requests, then reverses. Travels to extremes even without requests' },
        { name: 'LOOK (Recommended)', description: 'Travels only to furthest pending request in current direction, then reverses immediately' }
      ],

      coreEntities: [
        { name: 'ElevatorSystem', description: 'Main controller managing all elevators' },
        { name: 'Elevator', description: 'Individual elevator with state, position, and request queue' },
        { name: 'Request', description: 'Represents floor request with direction' },
        { name: 'DispatchStrategy', description: 'Interface for different scheduling algorithms' },
        { name: 'Display', description: 'Shows current floor and direction' }
      ],

      designPatterns: [
        'Strategy Pattern: Pluggable scheduling algorithms (FIFO, SCAN, LOOK)',
        'Observer Pattern: Display updates when elevator moves',
        'State Pattern: Elevator states (IDLE, MOVING_UP, MOVING_DOWN, DOOR_OPEN)',
        'Command Pattern: Encapsulate requests as objects'
      ],

      basicImplementation: {
        title: 'Elevator System Architecture',
        description: 'ElevatorSystem manages multiple Elevators with DispatchStrategy. Each Elevator has state (IDLE/UP/DOWN), current floor, and request queues. LOOK Algorithm: Move UP serving requests in order, reverse when no more UP requests, move DOWN serving in reverse order.',
        svgTemplate: 'elevatorSystem'
      },

      implementation: `from enum import Enum
from threading import Thread, Lock
from collections import deque
import heapq

class Direction(Enum):
    UP = 1
    DOWN = -1
    IDLE = 0

class ElevatorState(Enum):
    IDLE = 0
    MOVING = 1
    DOOR_OPEN = 2

class Request:
    def __init__(self, floor: int, direction: Direction = None):
        self.floor = floor
        self.direction = direction

class Elevator:
    def __init__(self, elevator_id: int, min_floor: int, max_floor: int):
        self.id = elevator_id
        self.current_floor = min_floor
        self.direction = Direction.IDLE
        self.state = ElevatorState.IDLE
        self.min_floor = min_floor
        self.max_floor = max_floor
        # Two sets: requests above and below current floor
        self.up_requests = set()
        self.down_requests = set()
        self.lock = Lock()

    def add_request(self, floor: int):
        with self.lock:
            if floor > self.current_floor:
                self.up_requests.add(floor)
            elif floor < self.current_floor:
                self.down_requests.add(floor)

            if self.direction == Direction.IDLE:
                self._set_direction()

    def _set_direction(self):
        if self.up_requests:
            self.direction = Direction.UP
        elif self.down_requests:
            self.direction = Direction.DOWN
        else:
            self.direction = Direction.IDLE

    def move(self):
        """LOOK algorithm implementation"""
        with self.lock:
            if self.direction == Direction.UP:
                if self.up_requests:
                    next_floor = min(self.up_requests)
                    self.up_requests.remove(next_floor)
                    self.current_floor = next_floor
                else:
                    self.direction = Direction.DOWN
                    self.move()
            elif self.direction == Direction.DOWN:
                if self.down_requests:
                    next_floor = max(self.down_requests)
                    self.down_requests.remove(next_floor)
                    self.current_floor = next_floor
                else:
                    self.direction = Direction.UP
                    self.move()`,

      keyQuestions: [
        {
          question: 'Why is the LOOK algorithm preferred over SCAN for elevator scheduling?',
          answer: 'SCAN always travels to the extreme floor (top or bottom) before reversing, even if there are no requests in that direction. LOOK improves on this by reversing as soon as there are no more pending requests ahead in the current direction. This reduces average wait time and unnecessary travel. In practice, LOOK provides better throughput and more responsive service. The tradeoff is slightly more complex implementation since you need to track the furthest pending request rather than always going to the building extremes.'
        },
        {
          question: 'How would you extend the system to support express elevators that skip certain floors?',
          answer: 'You would create an ExpressElevator subclass that maintains a set of serviced floors. The add_request method would filter out requests for non-serviced floors. The DispatchStrategy would need to be updated to consider which elevators can service which floors when assigning requests. You might also introduce a ZoneBasedDispatch strategy that assigns elevators to floor zones (e.g., low-rise floors 1-20, high-rise floors 21-40). This requires modifying the dispatch interface but not the core Elevator class.'
        },
        {
          question: 'What are the tradeoffs between running each elevator on its own thread vs. a single event loop?',
          answer: 'Separate threads per elevator provide true parallelism and simpler per-elevator logic, but introduce synchronization challenges when the dispatcher needs to read elevator state. A single event loop is easier to reason about and debug, but requires careful scheduling to prevent one elevator\'s processing from blocking others. In production systems like Akka-based implementations, an actor model is often used where each elevator is an actor processing messages sequentially, combining the simplicity of single-threaded logic with the concurrency of the actor system.'
        }
      ],

      tips: [
        'Clearly separate internal requests (buttons pressed inside the elevator) from external requests (hall buttons with UP/DOWN direction) -- they have different semantics.',
        'Use two sorted sets (up_requests and down_requests) in each elevator for O(log n) request management with the LOOK algorithm.',
        'The dispatch strategy should consider elevator proximity, current direction, and load when assigning requests -- not just distance.',
        'Model elevator states explicitly with a State Pattern or enum to handle transitions cleanly (IDLE -> MOVING -> DOOR_OPEN -> MOVING).',
        'Discuss the weight/capacity constraint -- an elevator should stop accepting passengers when full, which affects the dispatch strategy.'
      ]
    },
    {
      id: 'tic-tac-toe',
      title: 'Tic Tac Toe',
      subtitle: 'Classic Board Game',
      icon: 'grid',
      color: '#dc2626',
      difficulty: 'Easy',
      description: 'Design a Tic Tac Toe game with win detection, scoreboard, and extensible architecture.',

      introduction: `Tic Tac Toe is a simple game but provides an excellent opportunity to demonstrate clean OOP design, design patterns, and extensibility considerations. It is a popular LLD warm-up question because the domain is universally understood, letting interviewers focus on evaluating your design decisions rather than explaining requirements.

This problem tests your ability to apply the Strategy Pattern for win detection (separate strategies for rows, columns, and diagonals), the Observer Pattern for scoreboard updates, and the Single Responsibility Principle by separating the Board (grid management), Game (turn orchestration), and Scoreboard (statistics tracking) into distinct classes. It also tests your understanding of enums for type safety and immutability for Player objects.

The key design insight is making the win detection extensible through the Strategy Pattern. Instead of hardcoding win checks in the Game class, each winning condition (row, column, diagonal) is encapsulated in its own strategy class. This makes it trivial to extend to larger boards (4x4, 5x5) or add new win conditions (e.g., four-in-a-row on a larger grid) without modifying existing code.`,

      functionalRequirements: [
        'Two players alternate placing X and O on 3x3 grid',
        'Detect win conditions (row, column, diagonal)',
        'Detect draw when board is full',
        'Track scores across multiple games',
        'Validate moves (bounds and cell availability)'
      ],

      coreEntities: [
        { name: 'Symbol (Enum)', description: 'X, O, EMPTY values' },
        { name: 'GameStatus (Enum)', description: 'IN_PROGRESS, WINNER_X, WINNER_O, DRAW' },
        { name: 'Player', description: 'Name and assigned symbol (immutable)' },
        { name: 'Cell', description: 'Board position (mutable symbol)' },
        { name: 'Board', description: 'Manages 3×3 grid operations' },
        { name: 'Game', description: 'Orchestrates gameplay and win detection' },
        { name: 'Scoreboard', description: 'Tracks wins across sessions' }
      ],

      designPatterns: [
        'Strategy Pattern: Pluggable win detection (RowWinningStrategy, ColumnWinningStrategy, DiagonalWinningStrategy)',
        'Observer Pattern: Scoreboard observes game completion events',
        'Singleton Pattern: Single TicTacToeSystem instance'
      ],

      implementation: `from enum import Enum
from typing import List, Optional

class Symbol(Enum):
    X = 'X'
    O = 'O'
    EMPTY = ' '

class GameStatus(Enum):
    IN_PROGRESS = 0
    WINNER_X = 1
    WINNER_O = 2
    DRAW = 3

class Player:
    def __init__(self, name: str, symbol: Symbol):
        self.name = name
        self.symbol = symbol

class Board:
    def __init__(self, size: int = 3):
        self.size = size
        self.grid = [[Symbol.EMPTY] * size for _ in range(size)]

    def place(self, row: int, col: int, symbol: Symbol) -> bool:
        if self._is_valid(row, col) and self.grid[row][col] == Symbol.EMPTY:
            self.grid[row][col] = symbol
            return True
        return False

    def _is_valid(self, row: int, col: int) -> bool:
        return 0 <= row < self.size and 0 <= col < self.size

    def is_full(self) -> bool:
        return all(cell != Symbol.EMPTY for row in self.grid for cell in row)

class Game:
    def __init__(self, player1: Player, player2: Player):
        self.board = Board()
        self.players = [player1, player2]
        self.current_player_idx = 0
        self.status = GameStatus.IN_PROGRESS

    def make_move(self, row: int, col: int) -> bool:
        if self.status != GameStatus.IN_PROGRESS:
            return False

        current = self.players[self.current_player_idx]
        if self.board.place(row, col, current.symbol):
            if self._check_winner(current.symbol):
                self.status = GameStatus.WINNER_X if current.symbol == Symbol.X else GameStatus.WINNER_O
            elif self.board.is_full():
                self.status = GameStatus.DRAW
            else:
                self.current_player_idx = 1 - self.current_player_idx
            return True
        return False

    def _check_winner(self, symbol: Symbol) -> bool:
        # Check rows, columns, and diagonals
        for i in range(self.board.size):
            if all(self.board.grid[i][j] == symbol for j in range(self.board.size)):
                return True
            if all(self.board.grid[j][i] == symbol for j in range(self.board.size)):
                return True

        if all(self.board.grid[i][i] == symbol for i in range(self.board.size)):
            return True
        if all(self.board.grid[i][self.board.size-1-i] == symbol for i in range(self.board.size)):
            return True

        return False`,

      nonFunctionalRequirements: [
        'Follow OOP principles with clear separation of concerns',
        'Use enums for type safety (Symbol, GameStatus)',
        'Support extensible win detection strategies',
        'Maintain immutability for Player objects'
      ],

      keyQuestions: [
        {
          question: 'Why use the Strategy Pattern for win detection instead of a single method?',
          answer: 'Encapsulating each win condition (row, column, diagonal) as a separate strategy class makes the code more modular and testable. Each strategy can be unit-tested independently. More importantly, when extending to larger boards or different win conditions (e.g., four-in-a-row on a 5x5 board), you simply add a new strategy without modifying the Game class. This adheres to the Open/Closed Principle. The Game class iterates through its list of strategies, making it easy to compose different rule sets.'
        },
        {
          question: 'How would you extend this to support a larger board or more than two players?',
          answer: 'For a larger board, parameterize the Board constructor with size and create a WinCondition that specifies how many in a row are needed to win. For more than two players, change the players list from a fixed pair to a dynamic list with a circular turn index. You would need additional Symbol enum values and the win detection strategies would need to check for each symbol. The Scoreboard and GameStatus would also need to accommodate multiple potential winners.'
        },
        {
          question: 'What are the tradeoffs of O(1) win checking vs. O(n) scanning after each move?',
          answer: 'O(1) win checking uses arrays to track row/column/diagonal sums for each player (incrementing on placement). This is faster but uses more memory and is harder to implement correctly, especially for undo operations. O(n) scanning after each move is simpler and more intuitive, checking all cells in the affected row, column, and diagonals. For a 3x3 board, O(n) is perfectly fine since n=3. For larger boards or performance-critical applications, the O(1) approach is worth the added complexity.'
        }
      ],

      tips: [
        'Use enums for Symbol (X, O, EMPTY) and GameStatus (IN_PROGRESS, WINNER_X, WINNER_O, DRAW) to make code self-documenting.',
        'Separate Board (grid operations) from Game (turn logic, win detection) to follow the Single Responsibility Principle.',
        'Make Player objects immutable -- name and symbol should not change after construction.',
        'Consider an O(1) win-checking optimization using row/column/diagonal counters if the interviewer asks for performance improvements.',
        'Always validate moves before placing: check bounds, cell availability, and that the game is still in progress.'
      ]
    },
    {
      id: 'snake-ladder',
      title: 'Snake and Ladder',
      subtitle: 'Classic Board Game',
      icon: 'gamepad',
      color: '#16a34a',
      difficulty: 'Easy',
      description: 'Design the Snake and Ladder game with dice rolling, player turns, and board entities.',

      introduction: `Snake and Ladder is a classic board game that demonstrates clean OOP design with entities, game rules, and turn management. It is a popular LLD interview question because it has clear domain rules (snakes, ladders, dice, turns) that map well to distinct classes, letting interviewers evaluate how you decompose a system into objects.

This problem tests your understanding of the Template Method Pattern (Snake and Ladder share the same abstract BoardEntity structure but differ in validation rules), the Builder Pattern for constructing a complex Game object with validated snakes and ladders, and the Facade Pattern where the Game class serves as the single entry point hiding board logic, dice rolling, and turn management. It also tests proper use of data structures like Queue for turn management and HashMap for O(1) position transitions.

The key design insight is using a transitions HashMap that maps source positions to destination positions for both snakes and ladders. This unifies the handling of both entity types into a single O(1) lookup after each move, rather than iterating through separate lists of snakes and ladders. The Board class becomes a simple position transformer that the Game class consults after each dice roll.`,

      functionalRequirements: [
        'Players start at position 0 and move toward 100',
        'Roll dice (1-6) to determine movement',
        'Rolling 6 grants an extra turn',
        'Landing on snake slides player backward',
        'Landing on ladder moves player forward',
        'Victory requires landing exactly on cell 100',
        'Support multiple players with turn queue'
      ],

      coreEntities: [
        { name: 'GameStatus (Enum)', description: 'NOT_STARTED, RUNNING, FINISHED' },
        { name: 'Player', description: 'Name (immutable) and position (mutable, starts at 0)' },
        { name: 'BoardEntity (Abstract)', description: 'Base for Snake and Ladder with start/end positions' },
        { name: 'Snake', description: 'Validates start > end (downward movement)' },
        { name: 'Ladder', description: 'Validates start < end (upward movement)' },
        { name: 'Dice', description: 'Generates random rolls between 1-6' },
        { name: 'Board', description: 'Manages position transitions using Map for O(1) lookups' },
        { name: 'Game', description: 'Orchestrates gameplay using Queue for turn management' }
      ],

      designPatterns: [
        'Builder Pattern: Complex Game construction with validation',
        'Template Method Pattern: Snake and Ladder share structure with different validation',
        'Facade Pattern: Game as single entry point hiding complexity'
      ],

      implementation: `from enum import Enum
from collections import deque
from random import randint
from typing import Dict, List

class GameStatus(Enum):
    NOT_STARTED = 0
    RUNNING = 1
    FINISHED = 2

class Player:
    def __init__(self, name: str):
        self.name = name
        self.position = 0

class Dice:
    def __init__(self, faces: int = 6):
        self.faces = faces

    def roll(self) -> int:
        return randint(1, self.faces)

class Board:
    def __init__(self, size: int = 100):
        self.size = size
        self.transitions: Dict[int, int] = {}  # start -> end

    def add_snake(self, head: int, tail: int):
        assert head > tail, "Snake head must be above tail"
        self.transitions[head] = tail

    def add_ladder(self, bottom: int, top: int):
        assert bottom < top, "Ladder bottom must be below top"
        self.transitions[bottom] = top

    def get_final_position(self, position: int) -> int:
        return self.transitions.get(position, position)

class Game:
    def __init__(self, board: Board, players: List[Player]):
        self.board = board
        self.players = deque(players)
        self.status = GameStatus.NOT_STARTED
        self.winner = None
        self.dice = Dice()

    def start(self):
        self.status = GameStatus.RUNNING

    def take_turn(self) -> str:
        if self.status != GameStatus.RUNNING:
            return "Game not running"

        player = self.players[0]
        roll = self.dice.roll()
        new_pos = player.position + roll

        # Must land exactly on 100
        if new_pos > self.board.size:
            self.players.rotate(-1)  # Skip turn
            return f"{player.name} rolled {roll}, stays at {player.position}"

        # Apply snake/ladder
        final_pos = self.board.get_final_position(new_pos)
        player.position = final_pos

        result = f"{player.name} rolled {roll}, moved to {final_pos}"

        if final_pos == self.board.size:
            self.status = GameStatus.FINISHED
            self.winner = player
            return f"{result} - WINNER!"

        # Roll 6 = extra turn, otherwise rotate
        if roll != 6:
            self.players.rotate(-1)
        else:
            result += " (extra turn!)"

        return result`,

      nonFunctionalRequirements: [
        'O(1) position transition lookup using HashMap',
        'Validate board configuration (no overlapping snakes/ladders)',
        'Support configurable board size and dice faces',
        'Clean separation between board setup and gameplay'
      ],

      keyQuestions: [
        {
          question: 'Why use a HashMap for position transitions instead of separate Snake and Ladder lists?',
          answer: 'A HashMap mapping source to destination positions provides O(1) lookup regardless of the number of snakes and ladders. After a player lands on a cell, the Board simply checks if that cell is a key in the transitions map. This unifies the handling of snakes and ladders into a single lookup, eliminating the need to check two separate collections. It also makes validation simpler -- you can ensure no cell has both a snake and a ladder by checking for duplicate keys. The tradeoff is losing explicit type information about whether a transition is a snake or ladder, which can be recovered with a second map if needed for UI purposes.'
        },
        {
          question: 'How would you extend this to support power-ups or special cells?',
          answer: 'You would introduce a CellEffect interface with an apply(player, game) method and create subclasses like SnakeEffect, LadderEffect, DoubleTurnEffect, and SkipTurnEffect. The Board would map positions to CellEffect objects instead of simple destination integers. When a player lands on a cell, the Board returns the CellEffect which the Game applies. This uses the Strategy Pattern and keeps the Game class agnostic about specific cell behaviors, making it trivial to add new power-ups without modifying existing code.'
        },
        {
          question: 'What are the tradeoffs of using a Queue vs. a circular index for turn management?',
          answer: 'A Queue (deque) with rotation provides clean turn management: the current player is always at the front, and rotation moves them to the back. This naturally handles variable player counts and makes it easy to skip turns or grant extra turns. A circular index is simpler and uses less memory, but handling extra turns and removed players requires additional conditional logic. For Snake and Ladder where extra turns on rolling 6 is a rule, the Queue approach is cleaner because you simply do not rotate after a 6.'
        }
      ],

      tips: [
        'Model Snake and Ladder as subclasses of an abstract BoardEntity with a validate() method -- Snake ensures start > end, Ladder ensures start < end.',
        'Use a deque (double-ended queue) for turn management, which naturally supports extra turns when a player rolls a 6.',
        'Validate the board during construction: no snake head at position 100, no ladder base at position 1, no overlapping start positions.',
        'The exact-landing rule (must land exactly on 100 to win) is a common interview follow-up -- handle it by checking if new position exceeds the board size.',
        'Consider using the Builder Pattern for Game construction to enforce that at least 2 players, 1 snake, and 1 ladder are configured before starting.'
      ]
    },
    {
      id: 'logging-framework',
      title: 'Logging Framework',
      subtitle: 'Customizable Logger',
      icon: 'document',
      color: '#0891b2',
      difficulty: 'Medium',
      description: 'Design a logging framework with multiple log levels, appenders, and formatters.',

      introduction: `A logging framework provides a standardized way to record, format, filter, and route log messages. It is a common LLD interview question because it elegantly demonstrates multiple design patterns working together in a production-relevant system that every developer uses daily. Frameworks like Log4j, SLF4J, and Python's logging module follow the same architectural principles.

This problem tests your understanding of the Strategy Pattern (pluggable formatters and appenders), the Observer Pattern (appenders observe and react to log events), the Builder Pattern (complex configuration construction), the Singleton Pattern (global logger access), and the Chain of Responsibility Pattern (log levels filter which messages pass through). It also tests the Open/Closed Principle since adding a new appender (e.g., DatabaseAppender) or formatter (e.g., JSONFormatter) requires no changes to existing code.

The key design challenge is balancing flexibility with simplicity. The framework must support multiple output destinations simultaneously, each with potentially different formatters and minimum log levels, while maintaining thread safety and minimal performance overhead. Asynchronous logging via a queue-based appender is a common extension that prevents logging from blocking the application.`,

      functionalRequirements: [
        'Log Levels: DEBUG, INFO, WARN, ERROR, FATAL with configurable minimum',
        'Multiple Destinations: Console and file outputs simultaneously',
        'Message Routing: Single messages can route to multiple appenders',
        'Custom Formatting: Pluggable formatters with timestamp and level',
        'Asynchronous Support: Non-blocking logging',
        'Simple API: logger.info("message")'
      ],

      nonFunctionalRequirements: [
        'Thread Safety: Concurrent-safe without interleaving',
        'Performance: Minimal overhead on application',
        'Extensibility: Easy to add custom appenders/formatters'
      ],

      coreEntities: [
        { name: 'LogLevel (Enum)', description: 'DEBUG, INFO, WARN, ERROR, FATAL' },
        { name: 'LogMessage', description: 'Timestamp, level, content, metadata' },
        { name: 'Formatter', description: 'Converts messages to string format' },
        { name: 'Appender', description: 'Outputs to destinations (console, file)' },
        { name: 'Logger', description: 'Main interface for logging calls' },
        { name: 'LoggerConfig', description: 'Configuration management' }
      ],

      designPatterns: [
        'Strategy Pattern: Multiple formatters and appenders',
        'Observer Pattern: Appenders observe logger events',
        'Builder Pattern: Configuration construction',
        'Singleton Pattern: Single logger instance'
      ],

      implementation: `from enum import IntEnum
from datetime import datetime
from abc import ABC, abstractmethod
from threading import Lock
from queue import Queue
from threading import Thread

class LogLevel(IntEnum):
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3
    FATAL = 4

class LogMessage:
    def __init__(self, level: LogLevel, message: str):
        self.level = level
        self.message = message
        self.timestamp = datetime.now()

class Formatter(ABC):
    @abstractmethod
    def format(self, msg: LogMessage) -> str:
        pass

class SimpleFormatter(Formatter):
    def format(self, msg: LogMessage) -> str:
        return f"[{msg.timestamp}] [{msg.level.name}] {msg.message}"

class Appender(ABC):
    def __init__(self, formatter: Formatter = None):
        self.formatter = formatter or SimpleFormatter()

    @abstractmethod
    def append(self, msg: LogMessage):
        pass

class ConsoleAppender(Appender):
    def append(self, msg: LogMessage):
        print(self.formatter.format(msg))

class FileAppender(Appender):
    def __init__(self, filepath: str, formatter: Formatter = None):
        super().__init__(formatter)
        self.filepath = filepath
        self.lock = Lock()

    def append(self, msg: LogMessage):
        with self.lock:
            with open(self.filepath, 'a') as f:
                f.write(self.formatter.format(msg) + '\\n')

class Logger:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.appenders = []
        self.min_level = LogLevel.DEBUG

    def add_appender(self, appender: Appender):
        self.appenders.append(appender)

    def log(self, level: LogLevel, message: str):
        if level >= self.min_level:
            msg = LogMessage(level, message)
            for appender in self.appenders:
                appender.append(msg)

    def debug(self, msg): self.log(LogLevel.DEBUG, msg)
    def info(self, msg): self.log(LogLevel.INFO, msg)
    def warn(self, msg): self.log(LogLevel.WARN, msg)
    def error(self, msg): self.log(LogLevel.ERROR, msg)
    def fatal(self, msg): self.log(LogLevel.FATAL, msg)`,

      keyQuestions: [
        {
          question: 'Why use the Strategy Pattern for both formatters and appenders?',
          answer: 'Formatters and appenders represent independent dimensions of variability. A ConsoleAppender might use a SimpleFormatter while a FileAppender uses a JSONFormatter. The Strategy Pattern lets you mix and match any formatter with any appender, giving N*M combinations from N formatters and M appenders rather than requiring N*M separate classes. This follows the Open/Closed Principle: adding a new DatabaseAppender requires implementing just one class without modifying existing code. It also enables runtime configuration changes, such as switching from SimpleFormatter to JSONFormatter without restarting the application.'
        },
        {
          question: 'How would you add asynchronous logging to prevent blocking the application?',
          answer: 'You would create an AsyncAppender that wraps any existing appender. It maintains an internal message queue and a background thread that drains the queue and delegates to the wrapped appender. The append() method enqueues the message and returns immediately, making logging non-blocking. You need to handle queue capacity (drop vs. block when full), graceful shutdown (flush pending messages), and error handling in the background thread. This is the Decorator Pattern applied to appenders and is exactly how Log4j2 AsyncAppender works.'
        },
        {
          question: 'What are the tradeoffs of Singleton Logger vs. named logger hierarchy?',
          answer: 'A single Singleton Logger is simple but provides no granularity -- you cannot set different log levels for different parts of your application. A named logger hierarchy (like Log4j\'s com.myapp.service.UserService) allows per-package or per-class log levels, which is essential for debugging in production. The tradeoff is added complexity: you need a logger registry, name resolution, and level inheritance through the hierarchy. Most production frameworks use the hierarchy approach with a root logger as the default, which is the best of both worlds.'
        }
      ],

      tips: [
        'Use IntEnum for log levels so that level comparison is a simple integer comparison (e.g., ERROR > WARN > INFO > DEBUG).',
        'Each appender should have its own minimum log level, independent of the global logger level, for flexible filtering.',
        'Thread safety is critical: use locks in file appenders and consider a queue-based async appender for high-throughput scenarios.',
        'Demonstrate the Builder Pattern for logger configuration: Logger.builder().addAppender(console).setLevel(INFO).build().',
        'Mention structured logging as a modern extension -- log messages as key-value pairs (JSON) rather than formatted strings, which enables better search and analysis.'
      ]
    },
    {
      id: 'vending-machine',
      title: 'Vending Machine',
      subtitle: 'State Machine Design',
      icon: 'shoppingCart',
      color: '#d97706',
      difficulty: 'Medium',
      description: 'Design a vending machine with coin-based payments, product selection, and state management.',

      introduction: `The vending machine problem is one of the best demonstrations of the State Pattern in LLD interviews. The machine transitions through distinct states (Idle, Accepting Money, Item Selected, Dispensing, Returning Change) based on user actions, and each state defines which operations are valid and what transitions are possible. It is frequently asked because it maps directly to real-world finite state machines.

This problem tests your understanding of the State Pattern (each state encapsulates behavior and valid transitions), the Single Responsibility Principle (state logic is separated from the machine itself), and the Liskov Substitution Principle (all state classes implement the same interface but behave differently). It also demonstrates how to avoid massive if-else chains by delegating behavior to state objects.

The key design insight is that the VendingMachine class holds a reference to its current state object and delegates all user actions to it. Each state class handles actions appropriate for that state and transitions the machine to the next state. Invalid actions in a given state (e.g., dispensing when no money has been inserted) are handled gracefully by the state itself, eliminating the need for conditional checks in the main class.`,

      functionalRequirements: [
        'Accept coin-based payments with fixed denominations',
        'Enable product selection by code',
        'Dispense selected products',
        'Return change if amount exceeds price',
        'Allow transaction cancellation with refund',
        'Support inventory restocking'
      ],

      nonFunctionalRequirements: [
        'Ensure atomicity in purchase operations',
        'Handle one transaction at a time',
        'Follow OOP design principles'
      ],

      states: [
        'Idle: Awaiting user input',
        'Accepting Money: Processing coin insertions',
        'Item Selected: User chooses product',
        'Dispensing: Releasing item and calculating change',
        'Returning Change: Delivering remainder'
      ],

      coreEntities: [
        { name: 'VendingMachine', description: 'Main orchestrator with current state' },
        { name: 'State (Abstract)', description: 'Interface for all states' },
        { name: 'Item', description: 'Product with code, name, price, quantity' },
        { name: 'Inventory', description: 'Tracks stock levels' },
        { name: 'CoinBox', description: 'Manages inserted coins and change' }
      ],

      designPatterns: [
        'State Pattern: Manages operational states',
        'Strategy Pattern: Different payment validation',
        'Singleton Pattern: Single vending machine instance'
      ],

      implementation: `from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict

class Coin(Enum):
    PENNY = 1
    NICKEL = 5
    DIME = 10
    QUARTER = 25
    DOLLAR = 100

class Item:
    def __init__(self, code: str, name: str, price: int, quantity: int):
        self.code = code
        self.name = name
        self.price = price  # in cents
        self.quantity = quantity

class State(ABC):
    @abstractmethod
    def insert_coin(self, machine, coin: Coin): pass
    @abstractmethod
    def select_item(self, machine, code: str): pass
    @abstractmethod
    def dispense(self, machine): pass
    @abstractmethod
    def cancel(self, machine): pass

class IdleState(State):
    def insert_coin(self, machine, coin: Coin):
        machine.balance += coin.value
        machine.state = machine.accepting_money_state
        print(f"Inserted {coin.name}, balance: {machine.balance}")

    def select_item(self, machine, code: str):
        print("Please insert coins first")

    def dispense(self, machine):
        print("Please select an item first")

    def cancel(self, machine):
        print("No transaction to cancel")

class AcceptingMoneyState(State):
    def insert_coin(self, machine, coin: Coin):
        machine.balance += coin.value
        print(f"Inserted {coin.name}, balance: {machine.balance}")

    def select_item(self, machine, code: str):
        item = machine.inventory.get(code)
        if not item or item.quantity == 0:
            print("Item not available")
            return
        if machine.balance < item.price:
            print(f"Insufficient funds. Need {item.price - machine.balance} more")
            return
        machine.selected_item = item
        machine.state = machine.dispensing_state
        machine.dispense()

    def dispense(self, machine):
        print("Please select an item")

    def cancel(self, machine):
        print(f"Returning {machine.balance} cents")
        machine.balance = 0
        machine.state = machine.idle_state

class DispensingState(State):
    def insert_coin(self, machine, coin: Coin):
        print("Please wait, dispensing")

    def select_item(self, machine, code: str):
        print("Please wait, dispensing")

    def dispense(self, machine):
        item = machine.selected_item
        change = machine.balance - item.price
        item.quantity -= 1
        print(f"Dispensing {item.name}")
        if change > 0:
            print(f"Returning change: {change} cents")
        machine.balance = 0
        machine.selected_item = None
        machine.state = machine.idle_state

    def cancel(self, machine):
        print("Cannot cancel during dispensing")

class VendingMachine:
    def __init__(self):
        self.idle_state = IdleState()
        self.accepting_money_state = AcceptingMoneyState()
        self.dispensing_state = DispensingState()
        self.state = self.idle_state
        self.balance = 0
        self.selected_item = None
        self.inventory: Dict[str, Item] = {}`,

      keyQuestions: [
        {
          question: 'Why is the State Pattern preferred over if-else chains for the vending machine?',
          answer: 'With 5 states and 4+ actions, if-else chains result in 20+ conditional branches that are hard to read, test, and extend. The State Pattern encapsulates each state\'s behavior in its own class, making the code modular and testable. Adding a new state (e.g., MaintenanceMode) requires only creating a new class without modifying existing states. Each state class is also self-documenting: you can see exactly what happens when you insert a coin while in the AcceptingMoneyState. The tradeoff is more classes, but each is small, focused, and independently testable.'
        },
        {
          question: 'How would you extend this to support card payments and mobile payments?',
          answer: 'You would introduce a PaymentMethod interface with implementations for CoinPayment, CardPayment, and MobilePayment. The AcceptingMoneyState would delegate payment processing to the active PaymentMethod. Each payment method handles its own validation (e.g., card authorization, mobile wallet balance check). The VendingMachine would accept a PaymentMethod during the payment phase. This uses the Strategy Pattern for payment processing and keeps payment logic decoupled from the state machine logic.'
        },
        {
          question: 'What are the tradeoffs of creating state objects eagerly vs. lazily?',
          answer: 'Eager creation (as shown) pre-creates all state instances in the VendingMachine constructor. This avoids garbage collection overhead from repeatedly creating state objects and ensures states are always available. Lazy creation creates state objects on demand, which saves memory if some states are rarely reached. For a vending machine with only 4-5 states, eager creation is preferred because the memory cost is negligible and it eliminates the complexity of null checks or factory methods. In systems with many states or expensive state initialization, lazy creation with caching is the better approach.'
        }
      ],

      tips: [
        'Draw the state transition diagram first -- it serves as both your design document and a communication tool with the interviewer.',
        'Each state class should handle invalid operations gracefully (e.g., print a message) rather than throwing exceptions.',
        'The VendingMachine should hold pre-created instances of each state to avoid object creation overhead on every transition.',
        'Separate the Inventory management from the state machine logic -- the Inventory class should handle stock tracking independently.',
        'Consider atomicity: the dispense operation should deduct inventory, calculate change, and update state as a single atomic operation to prevent partial failures.'
      ]
    },
    {
      id: 'task-scheduler',
      title: 'Task Scheduler',
      subtitle: 'Job Scheduling System',
      icon: 'clock',
      color: '#9333ea',
      difficulty: 'Medium',
      description: 'Design a task scheduler that manages one-time and recurring tasks with concurrent execution.',

      introduction: `A Task Scheduler manages the execution of tasks at predefined times or intervals. It is a critical component in operating systems, distributed systems, and backend services, making it a highly practical LLD interview question. Real-world examples include cron jobs, Java's ScheduledExecutorService, and distributed schedulers like Apache Airflow.

This problem tests your understanding of the Priority Queue data structure (min-heap ordered by execution time), the Observer Pattern for task lifecycle notifications, concurrent programming with thread pools, and the Strategy Pattern for different scheduling policies. It also tests the Interface Segregation Principle by separating the scheduling interface from the execution interface.

The key design challenge is handling the timing loop efficiently. The scheduler must continuously check for tasks ready to execute without busy-waiting (which wastes CPU) or sleeping too long (which causes delays). Using a min-heap ensures the next task to execute is always at the top, and the scheduler only needs to check if the top task's scheduled time has passed. Recurring tasks require rescheduling after each execution, creating a self-maintaining schedule.`,

      functionalRequirements: [
        'One-time tasks executing at specific future times',
        'Recurring tasks running at fixed intervals',
        'Concurrent execution using worker threads',
        'Task cancellation before execution',
        'Observer notifications for task lifecycle events',
        'Status tracking throughout execution'
      ],

      nonFunctionalRequirements: [
        'Thread-safe concurrent scheduling',
        'Exception handling without crashing workers',
        'Tasks are independent (no dependencies)'
      ],

      coreEntities: [
        { name: 'Task', description: 'Runnable unit with execution time and status' },
        { name: 'ScheduledTask', description: 'Wrapper with scheduling metadata' },
        { name: 'TaskScheduler', description: 'Main scheduler using priority queue' },
        { name: 'WorkerPool', description: 'Thread pool for concurrent execution' },
        { name: 'TaskObserver', description: 'Listener for task events' }
      ],

      implementation: `import heapq
import threading
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, Optional
from concurrent.futures import ThreadPoolExecutor

class TaskStatus(Enum):
    PENDING = 0
    RUNNING = 1
    COMPLETED = 2
    FAILED = 3
    CANCELLED = 4

class Task:
    def __init__(self, task_id: str, func: Callable,
                 run_at: datetime, interval: Optional[timedelta] = None):
        self.task_id = task_id
        self.func = func
        self.run_at = run_at
        self.interval = interval  # None for one-time tasks
        self.status = TaskStatus.PENDING

    def __lt__(self, other):
        return self.run_at < other.run_at

class TaskScheduler:
    def __init__(self, num_workers: int = 4):
        self.tasks = []  # min-heap by run_at
        self.task_map = {}  # task_id -> Task
        self.lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=num_workers)
        self.running = False
        self.scheduler_thread = None

    def schedule(self, task: Task):
        with self.lock:
            heapq.heappush(self.tasks, task)
            self.task_map[task.task_id] = task

    def cancel(self, task_id: str) -> bool:
        with self.lock:
            if task_id in self.task_map:
                task = self.task_map[task_id]
                if task.status == TaskStatus.PENDING:
                    task.status = TaskStatus.CANCELLED
                    return True
        return False

    def start(self):
        self.running = True
        self.scheduler_thread = threading.Thread(target=self._run_scheduler)
        self.scheduler_thread.start()

    def _run_scheduler(self):
        while self.running:
            with self.lock:
                now = datetime.now()
                while self.tasks and self.tasks[0].run_at <= now:
                    task = heapq.heappop(self.tasks)
                    if task.status == TaskStatus.CANCELLED:
                        continue
                    self.executor.submit(self._execute_task, task)
            time.sleep(0.1)  # Check every 100ms

    def _execute_task(self, task: Task):
        try:
            task.status = TaskStatus.RUNNING
            task.func()
            task.status = TaskStatus.COMPLETED

            # Reschedule if recurring
            if task.interval:
                task.run_at = datetime.now() + task.interval
                task.status = TaskStatus.PENDING
                self.schedule(task)
        except Exception as e:
            task.status = TaskStatus.FAILED
            print(f"Task {task.task_id} failed: {e}")`,

      keyQuestions: [
        {
          question: 'Why use a min-heap (priority queue) instead of a sorted list for task scheduling?',
          answer: 'A min-heap provides O(log n) insertion and O(1) access to the next task to execute (the minimum element by scheduled time). A sorted list provides O(1) access to the minimum but O(n) insertion due to shifting elements. Since tasks are frequently added and removed, the heap provides better amortized performance. Additionally, the heap naturally handles recurring tasks: after execution, you update the next run time and re-insert, which is O(log n). The tradeoff is that cancellation requires O(n) to find the task, but using a task_map (HashMap) alongside the heap provides O(1) lookup for cancellation.'
        },
        {
          question: 'How would you extend this to support task dependencies (DAG-based scheduling)?',
          answer: 'You would add a depends_on list to each Task containing IDs of prerequisite tasks. The scheduler would maintain a dependency graph (DAG) and only add a task to the ready queue when all its dependencies are completed. A topological sort at validation time ensures there are no circular dependencies. When a task completes, the scheduler checks which dependent tasks now have all prerequisites met and moves them to the ready queue. This is essentially how Apache Airflow works, and it requires careful handling of failed dependencies (skip, retry, or fail dependent tasks).'
        },
        {
          question: 'What are the tradeoffs of a polling loop vs. condition variables for the scheduler?',
          answer: 'A polling loop (sleep + check) is simple but wastes CPU cycles or introduces latency depending on the sleep interval. Condition variables (or Event objects) allow the scheduler to sleep efficiently and be woken up when a new task is scheduled or when the next task\'s time arrives. The scheduler calculates the wait time until the next task and sleeps exactly that long. If a new task with an earlier time is added, the condition variable is signaled to wake the scheduler. This is more efficient but more complex to implement correctly, especially handling spurious wakeups and lock ordering.'
        }
      ],

      tips: [
        'Use Python\'s heapq module with a Task that implements __lt__ based on run_at for clean heap operations.',
        'Separate the scheduling concern (when to run) from the execution concern (how to run) using a ThreadPoolExecutor for worker management.',
        'Handle exceptions in task execution gracefully -- a failed task should not crash the scheduler or affect other tasks.',
        'For recurring tasks, calculate the next run time from the current time (not the scheduled time) to prevent drift accumulation.',
        'Mention that in production, you would use a persistent store (database) for task definitions so scheduled tasks survive scheduler restarts.'
      ]
    },
    {
      id: 'stack-overflow',
      title: 'Stack Overflow',
      subtitle: 'Q&A Platform',
      icon: 'messageSquare',
      color: '#ea580c',
      difficulty: 'Hard',
      description: 'Design a Q&A platform with voting, reputation, tags, and answer acceptance.',

      introduction: `Stack Overflow is a Q&A platform with user reputation management, voting mechanisms, and tag-based organization. It is a popular hard-level LLD question because it involves multiple interrelated entities (users, questions, answers, comments, votes, tags) and complex business rules around reputation and moderation. The design emphasizes strong consistency for voting and supports high-concurrency scenarios.

This problem tests your mastery of OOP inheritance hierarchies (Content -> Post -> Question/Answer, with Comment as a separate leaf), the Observer Pattern for reputation management (the ReputationManager observes vote events and updates user scores), the Strategy Pattern for search functionality (keyword search, tag search, user search), and the Facade Pattern (StackOverflowService provides a unified API). It also tests your understanding of thread safety for concurrent voting and reputation updates.

The key design challenge is the reputation system: votes on questions and answers trigger different reputation changes, and these changes must be atomic and consistent. When a user changes their vote (e.g., from upvote to downvote), the system must undo the previous reputation effect and apply the new one. The voting system must also prevent self-voting and handle vote toggling correctly.`,

      functionalRequirements: [
        'Users can post questions and answers',
        'Voting (upvote/downvote) on questions and answers',
        'Reputation system based on votes and accepts',
        'Tag-based categorization of questions',
        'Mark answer as accepted',
        'Comments on questions and answers',
        'Search by keywords, tags, users'
      ],

      coreEntities: [
        { name: 'User', description: 'Platform participant with thread-safe reputation' },
        { name: 'Content (Abstract)', description: 'Base class for all content' },
        { name: 'Post (Abstract)', description: 'Extends Content, enables voting' },
        { name: 'Question', description: 'Has tags, accepted answer reference' },
        { name: 'Answer', description: 'Linked to parent question' },
        { name: 'Comment', description: 'Flat annotations without voting' },
        { name: 'Vote', description: 'Tracks voter and vote type' },
        { name: 'Tag', description: 'Categories for questions' }
      ],

      designPatterns: [
        'Observer Pattern: ReputationManager listens for vote events',
        'Strategy Pattern: Multiple SearchStrategy implementations',
        'Facade Pattern: StackOverflowService provides unified API'
      ],

      reputationRules: [
        'Question upvote: +10 to author',
        'Question downvote: -2 to author',
        'Answer upvote: +10 to author',
        'Answer downvote: -2 to author',
        'Answer accepted: +15 to author',
        'Accepting answer: +2 to question author'
      ],

      implementation: `from datetime import datetime
from enum import Enum
from threading import Lock
from typing import List, Set, Optional

class VoteType(Enum):
    UPVOTE = 1
    DOWNVOTE = -1

class User:
    def __init__(self, user_id: str, username: str):
        self.user_id = user_id
        self.username = username
        self.reputation = 1
        self._lock = Lock()

    def update_reputation(self, delta: int):
        with self._lock:
            self.reputation = max(1, self.reputation + delta)

class Post:
    def __init__(self, post_id: str, author: User, content: str):
        self.post_id = post_id
        self.author = author
        self.content = content
        self.created_at = datetime.now()
        self.votes = {}  # user_id -> VoteType
        self._lock = Lock()

    def vote(self, user: User, vote_type: VoteType) -> bool:
        with self._lock:
            if user.user_id == self.author.user_id:
                return False  # Can't vote on own post

            old_vote = self.votes.get(user.user_id)
            if old_vote == vote_type:
                return False  # Already voted same way

            self.votes[user.user_id] = vote_type

            # Update reputation
            if old_vote:
                # Undo old vote
                self.author.update_reputation(-old_vote.value * 10)
            self.author.update_reputation(vote_type.value * 10)
            return True

    def get_score(self) -> int:
        return sum(v.value for v in self.votes.values())

class Question(Post):
    def __init__(self, post_id: str, author: User, title: str, content: str):
        super().__init__(post_id, author, content)
        self.title = title
        self.tags: Set[str] = set()
        self.answers: List['Answer'] = []
        self.accepted_answer: Optional['Answer'] = None

    def add_answer(self, answer: 'Answer'):
        self.answers.append(answer)

    def accept_answer(self, answer: 'Answer', user: User) -> bool:
        if user.user_id != self.author.user_id:
            return False  # Only question author can accept
        if answer not in self.answers:
            return False

        self.accepted_answer = answer
        answer.author.update_reputation(15)  # +15 for accepted
        self.author.update_reputation(2)  # +2 for accepting
        return True

class Answer(Post):
    def __init__(self, post_id: str, author: User, content: str, question: Question):
        super().__init__(post_id, author, content)
        self.question = question
        self.is_accepted = False`,

      nonFunctionalRequirements: [
        'Thread-safe voting and reputation updates',
        'Consistent reputation calculation across concurrent operations',
        'Scalable tag-based search and filtering',
        'Support for content moderation (edit, close, delete)'
      ],

      keyQuestions: [
        {
          question: 'Why use the Observer Pattern for reputation management instead of inline updates?',
          answer: 'Reputation changes are triggered by many different events: upvotes, downvotes, accepted answers, bounties, and edits. If reputation logic were inline in each event handler, it would be duplicated across multiple places and hard to maintain. The Observer Pattern centralizes all reputation logic in a ReputationManager that listens for events. When the reputation rules change (e.g., adjusting the points for an upvote from 10 to 15), you modify only the ReputationManager. It also makes testing easier -- you can verify reputation calculations in isolation without simulating the full voting flow.'
        },
        {
          question: 'How would you extend this to support a bounty system?',
          answer: 'You would add a Bounty class with fields for amount, expiration date, and status. The Question class gets an optional active_bounty reference. When a user sets a bounty, points are deducted from their reputation immediately (escrow model). When the bounty is awarded (manually by the asker or automatically to the highest-voted answer), the points transfer to the answer author. The ReputationManager handles the escrow deduction and award as atomic operations. You would also need a scheduler to auto-award expired bounties. This integrates cleanly with the existing Observer-based reputation system.'
        },
        {
          question: 'What are the tradeoffs of storing votes in a map vs. a separate Vote entity?',
          answer: 'A map (user_id -> VoteType) on each Post is simple and provides O(1) lookup to check if a user has already voted, but loses metadata like when the vote was cast. A separate Vote entity preserves full audit history and supports features like vote reversal within a time window, but requires more storage and an additional lookup step. For an interview, the map approach is usually sufficient. In production, a separate votes table with (user_id, post_id, vote_type, timestamp) provides the best of both worlds with proper indexing.'
        }
      ],

      tips: [
        'Model the content hierarchy carefully: Content (base) -> Post (adds voting) -> Question and Answer, with Comment as a separate non-votable entity.',
        'Use a map (user_id -> VoteType) on each Post to efficiently track and toggle votes while preventing duplicate voting.',
        'Implement reputation with a minimum floor (e.g., reputation cannot go below 1) to prevent negative reputation.',
        'Separate the search functionality into strategies: KeywordSearchStrategy, TagSearchStrategy, UserSearchStrategy -- each can use different indexing approaches.',
        'Discuss concurrency: use locks on individual Post objects for voting rather than a global lock, enabling parallel votes on different posts.'
      ]
    },
    {
      id: 'chess',
      title: 'Chess Game',
      subtitle: 'Classic Board Game',
      icon: 'crown',
      color: '#b45309',
      difficulty: 'Hard',
      description: 'Design a chess game with piece movements, game rules, check/checkmate detection.',

      introduction: `Chess is one of the most complex LLD problems and a favorite at top tech companies for senior-level interviews. It tests your ability to model intricate game logic using OOP principles, with challenges spanning piece movement rules, board state management, and game condition detection (check, checkmate, stalemate). The depth of the problem allows interviewers to probe at different levels of detail.

The Strategy Pattern is perfect for chess pieces because each piece type has different movement rules, but we want to treat them uniformly through a common Piece interface. The Factory Pattern simplifies piece creation during board setup. The Command Pattern enables undo/redo by encapsulating each move as a reversible command object. The Observer Pattern notifies the UI and game log of state changes. This problem also deeply tests the Open/Closed Principle: adding a new piece type (in chess variants) should not require modifying existing piece classes.

The key design challenge is implementing check and checkmate detection efficiently. After every move, you must verify whether the move puts or leaves the current player's king in check (illegal move), and whether the opponent is now in check, checkmate, or stalemate. This requires generating all possible moves for all pieces of a given color, which tests both your algorithm design and your ability to keep the code clean using polymorphism.`,

      functionalRequirements: [
        'Represent 8x8 chess board with alternating colors',
        'Support all six piece types: King, Queen, Rook, Bishop, Knight, Pawn',
        'Implement unique movement rules for each piece',
        'Validate legal moves (bounds, blocking, capture rules)',
        'Detect check, checkmate, and stalemate conditions',
        'Support special moves: castling, en passant, pawn promotion',
        'Alternate turns between white and black players'
      ],

      nonFunctionalRequirements: [
        'Follow SOLID principles for extensibility',
        'Use design patterns appropriately',
        'Efficient move validation'
      ],

      pieceMovements: [
        { piece: 'King', movement: 'One square in any direction' },
        { piece: 'Queen', movement: 'Any number of squares horizontally, vertically, or diagonally' },
        { piece: 'Rook', movement: 'Any number of squares horizontally or vertically' },
        { piece: 'Bishop', movement: 'Any number of squares diagonally' },
        { piece: 'Knight', movement: 'L-shape: 2 squares in one direction + 1 perpendicular (can jump)' },
        { piece: 'Pawn', movement: 'Forward one (or two from start), captures diagonally' }
      ],

      coreEntities: [
        { name: 'Piece (Abstract)', description: 'Base class with color, position, and abstract canMove method' },
        { name: 'King, Queen, Rook, Bishop, Knight, Pawn', description: 'Concrete pieces implementing movement logic' },
        { name: 'Board', description: '8x8 grid managing piece placement and move validation' },
        { name: 'Cell/Square', description: 'Individual board position with optional piece' },
        { name: 'Player', description: 'Represents white or black player' },
        { name: 'Move', description: 'Encapsulates piece, source, destination' },
        { name: 'Game', description: 'Orchestrates gameplay, turn management, win detection' }
      ],

      designPatterns: [
        'Strategy Pattern: Different movement strategies for each piece type',
        'Factory Pattern: PieceFactory creates pieces based on type',
        'Command Pattern: Move objects for undo/redo capability',
        'Observer Pattern: Notify UI of game state changes'
      ],

      implementation: `from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Optional, Tuple

class Color(Enum):
    WHITE = 'white'
    BLACK = 'black'

class PieceType(Enum):
    KING = 'K'
    QUEEN = 'Q'
    ROOK = 'R'
    BISHOP = 'B'
    KNIGHT = 'N'
    PAWN = 'P'

class Piece(ABC):
    def __init__(self, color: Color, row: int, col: int):
        self.color = color
        self.row = row
        self.col = col
        self.has_moved = False

    @abstractmethod
    def get_type(self) -> PieceType:
        pass

    @abstractmethod
    def can_move(self, board: 'Board', dest_row: int, dest_col: int) -> bool:
        pass

    def _is_valid_position(self, row: int, col: int) -> bool:
        return 0 <= row < 8 and 0 <= col < 8

class Knight(Piece):
    def get_type(self) -> PieceType:
        return PieceType.KNIGHT

    def can_move(self, board: 'Board', dest_row: int, dest_col: int) -> bool:
        if not self._is_valid_position(dest_row, dest_col):
            return False

        row_diff = abs(dest_row - self.row)
        col_diff = abs(dest_col - self.col)

        # L-shape: 2+1 or 1+2
        if not ((row_diff == 2 and col_diff == 1) or (row_diff == 1 and col_diff == 2)):
            return False

        # Check destination
        dest_piece = board.get_piece(dest_row, dest_col)
        return dest_piece is None or dest_piece.color != self.color

class Rook(Piece):
    def get_type(self) -> PieceType:
        return PieceType.ROOK

    def can_move(self, board: 'Board', dest_row: int, dest_col: int) -> bool:
        if not self._is_valid_position(dest_row, dest_col):
            return False

        # Must move in straight line
        if self.row != dest_row and self.col != dest_col:
            return False

        # Check path is clear
        return board.is_path_clear(self.row, self.col, dest_row, dest_col)

class Board:
    def __init__(self):
        self.grid = [[None for _ in range(8)] for _ in range(8)]
        self._setup_pieces()

    def get_piece(self, row: int, col: int) -> Optional[Piece]:
        return self.grid[row][col]

    def is_path_clear(self, start_row: int, start_col: int,
                      end_row: int, end_col: int) -> bool:
        row_step = 0 if start_row == end_row else (1 if end_row > start_row else -1)
        col_step = 0 if start_col == end_col else (1 if end_col > start_col else -1)

        row, col = start_row + row_step, start_col + col_step
        while (row, col) != (end_row, end_col):
            if self.grid[row][col] is not None:
                return False
            row += row_step
            col += col_step

        # Check destination (can capture enemy)
        dest_piece = self.grid[end_row][end_col]
        return dest_piece is None or dest_piece.color != self.grid[start_row][start_col].color

class Game:
    def __init__(self):
        self.board = Board()
        self.current_turn = Color.WHITE
        self.is_over = False
        self.winner = None

    def make_move(self, start: Tuple[int, int], end: Tuple[int, int]) -> bool:
        piece = self.board.get_piece(*start)
        if piece is None or piece.color != self.current_turn:
            return False

        if not piece.can_move(self.board, *end):
            return False

        # Execute move
        self.board.grid[end[0]][end[1]] = piece
        self.board.grid[start[0]][start[1]] = None
        piece.row, piece.col = end
        piece.has_moved = True

        # Switch turn
        self.current_turn = Color.BLACK if self.current_turn == Color.WHITE else Color.WHITE
        return True`,

      keyQuestions: [
        {
          question: 'Why use polymorphism for piece movement instead of a switch statement on piece type?',
          answer: 'Each piece type has unique movement rules, and polymorphism lets you call piece.can_move(board, dest) without knowing the concrete type. This eliminates a large switch statement that would grow with every new piece type. Each Piece subclass encapsulates its own movement logic, making it independently testable. When adding variant pieces (e.g., Archbishop in Chess960), you simply create a new subclass. The Board and Game classes remain unchanged, perfectly demonstrating the Open/Closed Principle. Polymorphism also enables clean move generation: iterate all pieces and call get_valid_moves() uniformly.'
        },
        {
          question: 'How would you implement undo/redo for chess moves?',
          answer: 'Use the Command Pattern: create a MoveCommand class that stores the piece, source position, destination position, any captured piece, and special move metadata (castling rook movement, en passant capture, pawn promotion choice). The execute() method performs the move, and undo() restores the exact previous state. A move history stack enables undo, and a redo stack stores undone moves. Each MoveCommand must capture all side effects: the piece\'s has_moved flag, captured piece restoration, and castling right updates. This is essential for implementing game analysis and move-by-move review.'
        },
        {
          question: 'What are the tradeoffs of validating moves in the Piece class vs. the Board class?',
          answer: 'Validating in the Piece class keeps movement logic close to the entity it belongs to (Single Responsibility), but pieces need a reference to the Board to check for blocking pieces and captures. Validating in the Board class centralizes all validation but creates a monolithic class that knows too much about each piece type. The recommended approach is split validation: each Piece subclass handles its own geometric movement rules (e.g., Knight moves in L-shape) and the Board handles global concerns like path clearing, checking if a move leaves the king in check, and enforcing turn order. This separation keeps both classes focused.'
        }
      ],

      tips: [
        'Start with the Piece hierarchy and implement one simple piece (Knight) completely before tackling more complex ones like Pawn.',
        'Use the Board\'s is_path_clear() method for sliding pieces (Rook, Bishop, Queen) to check for blocking pieces along the movement path.',
        'Implement check detection by asking: after this move, can any opponent piece capture my king? This requires generating all opponent moves.',
        'Handle special moves (castling, en passant, pawn promotion) as separate validation methods rather than cluttering the main move logic.',
        'Consider using a FEN (Forsyth-Edwards Notation) string for board serialization -- it demonstrates knowledge of chess programming conventions and enables save/load functionality.'
      ]
    },
    {
      id: 'atm-system',
      title: 'ATM System',
      subtitle: 'Banking Machine',
      icon: 'creditCard',
      color: '#0d9488',
      difficulty: 'Medium',
      description: 'Design an ATM system with card authentication, transactions, and state management.',

      introduction: `The ATM system is a classic example of the State Pattern in action and a frequently asked LLD interview question at banks and fintech companies. The ATM transitions through distinct states (Idle, Card Inserted, PIN Entered, Transaction) based on user actions, making it ideal for demonstrating state-based design. Unlike the simpler vending machine, the ATM adds authentication, multiple transaction types, and the Chain of Responsibility for cash dispensing.

This problem tests your understanding of the State Pattern (each ATM state defines valid operations and transitions), the Chain of Responsibility Pattern (cash dispensing cascades through denomination handlers from largest to smallest), the Strategy Pattern (different transaction types like withdrawal, deposit, transfer), and transaction atomicity (a failed withdrawal must roll back the account balance). It also tests security considerations like PIN retry limits and card blocking.

The key design challenge is the cash dispensing algorithm using the Chain of Responsibility Pattern. Each denomination handler (e.g., $100, $50, $20) tries to dispense as many bills as possible from its stock, then passes the remaining amount to the next handler. If the chain cannot satisfy the total amount, the entire dispensing must be rolled back. This two-phase approach (check feasibility first, then dispense) ensures atomicity.`,

      functionalRequirements: [
        'Card insertion and ejection',
        'PIN authentication (with retry limit)',
        'Balance inquiry',
        'Cash withdrawal with denomination selection',
        'Cash deposit',
        'Fund transfer between accounts',
        'Print receipt'
      ],

      nonFunctionalRequirements: [
        'Thread-safe for concurrent operations',
        'Validate user balance AND ATM cash availability',
        'Secure PIN handling',
        'Transaction atomicity'
      ],

      states: [
        'Idle: Awaiting card insertion',
        'Card Inserted: Awaiting PIN entry',
        'Authenticated: User verified, awaiting operation selection',
        'Transaction: Processing withdrawal/deposit/transfer',
        'Cash Dispensing: Releasing cash to user'
      ],

      coreEntities: [
        { name: 'ATM', description: 'Main context class holding current state' },
        { name: 'ATMState (Interface)', description: 'Defines insertCard, enterPin, selectOperation, etc.' },
        { name: 'IdleState, HasCardState, AuthenticatedState', description: 'Concrete states' },
        { name: 'Card', description: 'Customer card with number and PIN' },
        { name: 'Account', description: 'Bank account with balance' },
        { name: 'CashDispenser', description: 'Manages cash inventory by denomination' },
        { name: 'Transaction', description: 'Records transaction details' }
      ],

      designPatterns: [
        'State Pattern: ATM states manage allowed operations',
        'Chain of Responsibility: Cash dispensing by denomination',
        'Strategy Pattern: Different transaction types',
        'Singleton Pattern: Single ATM instance'
      ],

      cashDispensingChain: [
        'FiveHundredDispenser → TwoHundredDispenser → OneHundredDispenser → FiftyDispenser → TwentyDispenser',
        'Each dispenser handles its denomination and passes remainder to next'
      ],

      implementation: `from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional
from dataclasses import dataclass

class TransactionType(Enum):
    BALANCE_INQUIRY = 'balance'
    WITHDRAW = 'withdraw'
    DEPOSIT = 'deposit'
    TRANSFER = 'transfer'

@dataclass
class Card:
    card_number: str
    pin: str
    account_id: str

@dataclass
class Account:
    account_id: str
    balance: float

    def withdraw(self, amount: float) -> bool:
        if amount <= self.balance:
            self.balance -= amount
            return True
        return False

    def deposit(self, amount: float):
        self.balance += amount

class ATMState(ABC):
    @abstractmethod
    def insert_card(self, atm: 'ATM', card: Card): pass
    @abstractmethod
    def enter_pin(self, atm: 'ATM', pin: str): pass
    @abstractmethod
    def select_operation(self, atm: 'ATM', op: TransactionType): pass
    @abstractmethod
    def withdraw(self, atm: 'ATM', amount: float): pass
    @abstractmethod
    def eject_card(self, atm: 'ATM'): pass

class IdleState(ATMState):
    def insert_card(self, atm: 'ATM', card: Card):
        atm.current_card = card
        atm.state = HasCardState()
        print("Card inserted. Please enter PIN.")

    def enter_pin(self, atm, pin): print("Please insert card first")
    def select_operation(self, atm, op): print("Please insert card first")
    def withdraw(self, atm, amount): print("Please insert card first")
    def eject_card(self, atm): print("No card to eject")

class HasCardState(ATMState):
    def __init__(self):
        self.pin_attempts = 0
        self.max_attempts = 3

    def insert_card(self, atm, card):
        print("Card already inserted")

    def enter_pin(self, atm: 'ATM', pin: str):
        if atm.current_card.pin == pin:
            atm.state = AuthenticatedState()
            print("PIN correct. Select operation.")
        else:
            self.pin_attempts += 1
            if self.pin_attempts >= self.max_attempts:
                print("Too many attempts. Card blocked.")
                atm.eject_card()
            else:
                print(f"Wrong PIN. {self.max_attempts - self.pin_attempts} attempts left.")

    def select_operation(self, atm, op): print("Please enter PIN first")
    def withdraw(self, atm, amount): print("Please enter PIN first")
    def eject_card(self, atm: 'ATM'):
        atm.current_card = None
        atm.state = IdleState()
        print("Card ejected")

class AuthenticatedState(ATMState):
    def insert_card(self, atm, card): print("Card already inserted")
    def enter_pin(self, atm, pin): print("Already authenticated")

    def select_operation(self, atm: 'ATM', op: TransactionType):
        account = atm.get_account(atm.current_card.account_id)
        if op == TransactionType.BALANCE_INQUIRY:
            print(f"Balance: $" + str(round(account.balance, 2)))
        elif op == TransactionType.WITHDRAW:
            print("Enter withdrawal amount")

    def withdraw(self, atm: 'ATM', amount: float):
        account = atm.get_account(atm.current_card.account_id)
        if account.withdraw(amount):
            if atm.cash_dispenser.dispense(amount):
                print(f"Please take $" + str(round(amount, 2)))
            else:
                account.deposit(amount)  # Rollback
                print("ATM has insufficient cash")
        else:
            print("Insufficient funds")

    def eject_card(self, atm: 'ATM'):
        atm.current_card = None
        atm.state = IdleState()
        print("Card ejected. Thank you!")

# Chain of Responsibility for cash dispensing
class CashDispenser:
    def __init__(self):
        self.denominations = {100: 10, 50: 20, 20: 50}  # value: count

    def dispense(self, amount: float) -> bool:
        remaining = int(amount)
        dispensed = {}

        for denom in sorted(self.denominations.keys(), reverse=True):
            if remaining >= denom and self.denominations[denom] > 0:
                count = min(remaining // denom, self.denominations[denom])
                dispensed[denom] = count
                remaining -= count * denom

        if remaining == 0:
            for d, c in dispensed.items():
                self.denominations[d] -= c
            return True
        return False

class ATM:
    def __init__(self):
        self.state = IdleState()
        self.current_card: Optional[Card] = None
        self.cash_dispenser = CashDispenser()
        self.accounts = {}  # account_id -> Account

    def get_account(self, account_id: str) -> Account:
        return self.accounts.get(account_id)

    def insert_card(self, card: Card): self.state.insert_card(self, card)
    def enter_pin(self, pin: str): self.state.enter_pin(self, pin)
    def withdraw(self, amount: float): self.state.withdraw(self, amount)
    def eject_card(self): self.state.eject_card(self)`,

      keyQuestions: [
        {
          question: 'Why use Chain of Responsibility for cash dispensing instead of a simple greedy algorithm?',
          answer: 'The Chain of Responsibility Pattern decouples denomination-specific logic into separate handler classes, each responsible for one denomination. This follows the Single Responsibility Principle and makes it trivial to add or remove denominations (e.g., adding $10 bills) without modifying existing handlers. A simple greedy algorithm in one method would become a long if-else chain that violates the Open/Closed Principle. The chain also naturally supports different dispensing strategies: you can reorder the chain to prefer smaller bills, or swap in denomination handlers for different currencies. Each handler encapsulates its own stock tracking.'
        },
        {
          question: 'How would you extend this to support deposit operations with bill recognition?',
          answer: 'You would add a DepositSlot class that accepts physical bills and coins, with a BillValidator that identifies denominations. The AuthenticatedState would handle the deposit transaction type by activating the deposit slot, summing the validated amounts, and crediting the account. A DepositTransaction subclass would record the breakdown of deposited bills. The CashDispenser inventory should be updated with deposited bills to maintain accurate stock. You would also need a new DepositingState in the state machine to handle the multi-step deposit process (insert bills, confirm amount, finalize).'
        },
        {
          question: 'What are the tradeoffs of the two-phase dispense approach (check then dispense) vs. single-phase?',
          answer: 'The two-phase approach first checks if the full amount can be dispensed using available denominations (dry run), then actually dispenses. This prevents partial dispensing where the machine gives out some bills but cannot complete the amount. Single-phase dispensing is simpler but risks an inconsistent state if the chain fails midway -- you would need to re-collect dispensed bills (impossible with a physical machine). The tradeoff is that two-phase requires iterating the chain twice, but this is negligible for the small number of denominations. In production ATMs, the two-phase approach with transaction logging is mandatory for auditability.'
        }
      ],

      tips: [
        'Draw the state transition diagram clearly: Idle -> HasCard -> Authenticated -> (various transactions) -> Idle.',
        'Implement PIN retry with a counter in the HasCardState -- after 3 failed attempts, block the card and eject it.',
        'The cash dispensing chain should check feasibility before dispensing: calculate if the total can be assembled from available denominations, then dispense.',
        'Always roll back the account balance if cash dispensing fails -- this demonstrates understanding of transaction atomicity.',
        'Consider adding a receipt generation step using the Observer Pattern to log all transaction details.'
      ]
    },
    {
      id: 'design-hashmap',
      isNew: true,
      title: 'Design HashMap',
      subtitle: 'Hash Table Implementation',
      icon: 'database',
      color: '#4f46e5',
      difficulty: 'Easy',
      description: 'Design a HashMap from scratch with put, get, and remove operations using hashing and collision handling.',

      introduction: `The HashMap is one of the most fundamental data structures in computer science and a top-tier LLD interview question. Designing one from scratch tests your understanding of hashing, collision resolution, and dynamic resizing. It appears frequently because it combines algorithmic thinking (hash functions, load factors) with OOP design (clean API, encapsulation of internal structure).

From an OOP perspective, this problem tests encapsulation (hiding the internal bucket array and hash function from users), the Single Responsibility Principle (separating hashing, bucket management, and resizing concerns), and the Template Method Pattern (the resize operation follows a fixed algorithm but the allocation strategy could be overridden). It also tests your understanding of generics since a HashMap should work with any hashable key type and any value type.

The key insight is using an array of buckets where each bucket handles collisions via chaining (linked lists) or open addressing. A good hash function distributes keys uniformly across buckets, minimizing chain lengths. When the load factor (size/capacity) exceeds a threshold (typically 0.75), the array is doubled and all entries are rehashed. This amortized resizing keeps average operations at O(1) while gracefully handling growth.`,

      coreEntities: [
        { name: 'HashMap<K, V>', description: 'Main class with array of buckets, size tracking, and load factor threshold' },
        { name: 'Entry<K, V>', description: 'Key-value pair node with next pointer for chaining' },
        { name: 'Bucket', description: 'Linked list head for collision chaining at each array index' }
      ],

      designPatterns: [
        'Hashing Pattern: Convert key to array index via hash function + modulo',
        'Chaining Pattern: Linked list at each bucket for collision resolution',
        'Amortized Resize: Double capacity when load factor exceeds threshold'
      ],

      implementation: `class Entry:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.next = None

class HashMap:
    def __init__(self, capacity=16, load_factor=0.75):
        self.capacity = capacity
        self.load_factor = load_factor
        self.size = 0
        self.buckets = [None] * self.capacity

    def _hash(self, key) -> int:
        return hash(key) % self.capacity

    def put(self, key, value):
        index = self._hash(key)
        entry = self.buckets[index]

        # Update existing key
        while entry:
            if entry.key == key:
                entry.value = value
                return
            entry = entry.next

        # Insert new entry at head
        new_entry = Entry(key, value)
        new_entry.next = self.buckets[index]
        self.buckets[index] = new_entry
        self.size += 1

        # Resize if needed
        if self.size / self.capacity > self.load_factor:
            self._resize()

    def get(self, key):
        index = self._hash(key)
        entry = self.buckets[index]
        while entry:
            if entry.key == key:
                return entry.value
            entry = entry.next
        return None

    def remove(self, key) -> bool:
        index = self._hash(key)
        entry = self.buckets[index]
        prev = None
        while entry:
            if entry.key == key:
                if prev:
                    prev.next = entry.next
                else:
                    self.buckets[index] = entry.next
                self.size -= 1
                return True
            prev = entry
            entry = entry.next
        return False

    def _resize(self):
        old_buckets = self.buckets
        self.capacity *= 2
        self.buckets = [None] * self.capacity
        self.size = 0
        for bucket in old_buckets:
            entry = bucket
            while entry:
                self.put(entry.key, entry.value)
                entry = entry.next`,

      functionalRequirements: [
        'put(key, value): Insert or update a key-value pair',
        'get(key): Retrieve value by key, return None if not found',
        'remove(key): Delete a key-value pair, return success/failure',
        'Automatic resizing when load factor exceeds threshold',
        'Handle hash collisions via chaining (linked list per bucket)',
        'Support any hashable key type'
      ],

      nonFunctionalRequirements: [
        'O(1) average time complexity for put, get, and remove',
        'O(n) worst case when all keys hash to the same bucket',
        'Amortized O(1) insertion including resize cost',
        'Memory efficient with configurable initial capacity and load factor'
      ],

      keyQuestions: [
        {
          question: 'Why use chaining (linked lists) over open addressing for collision resolution?',
          answer: 'Chaining with linked lists is simpler to implement and handles high load factors gracefully -- the chains simply grow longer. Open addressing (linear probing, quadratic probing, double hashing) stores all entries in the array itself and has better cache locality for small load factors, but performance degrades sharply as the load factor approaches 1.0. Chaining also handles deletion cleanly (just remove the node), while open addressing requires tombstone markers that complicate the code. Java\'s HashMap uses chaining (switching to trees at 8+ collisions), while Python\'s dict uses open addressing. For interviews, chaining is preferred for its simplicity.'
        },
        {
          question: 'How would you extend this to be thread-safe for concurrent access?',
          answer: 'The simplest approach is a global lock, but this serializes all operations. A better approach is bucket-level locking (striped locks): use an array of locks where each lock protects a subset of buckets. This allows concurrent access to different buckets. Java\'s ConcurrentHashMap takes this further with a lock-free read path using volatile fields and CAS operations, only locking for writes. Resize operations are the hardest part -- you can either lock the entire map during resize, or use a technique like incremental resizing where old and new arrays coexist during migration.'
        },
        {
          question: 'What are the tradeoffs of the load factor threshold (0.75)?',
          answer: 'A load factor of 0.75 balances memory usage and performance. Lower thresholds (e.g., 0.5) resize sooner, wasting memory but keeping chains short for faster lookups. Higher thresholds (e.g., 0.9) use memory efficiently but allow longer chains, degrading to O(n) lookups more often. The value 0.75 was chosen empirically by Java\'s HashMap designers as the sweet spot. For read-heavy workloads, a lower threshold is better. For memory-constrained environments, a higher threshold is acceptable. The initial capacity also matters -- starting too small causes frequent early resizes.'
        }
      ],

      tips: [
        'Always use the modulo of the hash value to map to bucket indices: hash(key) % capacity. Mention that Java additionally applies a spread function to reduce clustering.',
        'Insert new entries at the head of the chain for O(1) insertion instead of traversing to the tail.',
        'During resize, rehash all entries because the bucket index changes when capacity changes (hash % old_capacity != hash % new_capacity).',
        'Discuss the tradeoff between chaining and open addressing -- mention that Java HashMap uses chaining with tree conversion at 8+ collisions per bucket.',
        'Handle edge cases: null keys, resize during iteration, and the fact that _resize calls put() recursively but should not trigger another resize.'
      ]
    },
    {
      id: 'splitwise',
      isNew: true,
      title: 'Splitwise',
      subtitle: 'Expense Sharing',
      icon: 'dollarSign',
      color: '#0ea5e9',
      difficulty: 'Medium',
      description: 'Design an expense sharing system where users can split bills and track balances with friends.',

      introduction: `Splitwise is a popular expense-sharing app that simplifies splitting bills among groups of friends. It is a frequently asked LLD question at companies like Google, Amazon, and Flipkart because it combines clean OOP modeling with an interesting algorithmic challenge: debt simplification. The core challenge is maintaining a balance graph between users and minimizing the number of settlement transactions.

This problem tests your understanding of the Strategy Pattern for different split types (equal, exact, percentage), the Observer Pattern for notifying users of new expenses, the Facade Pattern for providing a clean ExpenseManager API, and graph algorithms for debt simplification. It also tests the Open/Closed Principle since adding a new split type (e.g., share-based splitting) should not require modifying existing split classes.

The key design decisions involve choosing between storing individual transactions vs. net balances (net balances are more memory-efficient and simplify debt calculation), implementing the debt simplification algorithm (greedy matching of largest creditor with largest debtor), and handling floating-point precision for monetary calculations. The balance sheet uses a 2D map where balance[A][B] > 0 means B owes A, enabling O(1) balance lookups between any pair of users.`,

      coreEntities: [
        { name: 'User', description: 'Participant with ID, name, email, and balance map' },
        { name: 'Group', description: 'Collection of users sharing expenses together' },
        { name: 'Expense', description: 'A bill paid by one user, split among participants' },
        { name: 'Split (Abstract)', description: 'Base class for EqualSplit, ExactSplit, PercentageSplit' },
        { name: 'BalanceSheet', description: 'Tracks net amounts owed between pairs of users' },
        { name: 'Transaction', description: 'Settlement payment from one user to another' }
      ],

      designPatterns: [
        'Strategy Pattern: Different split calculation strategies (equal, exact, percentage)',
        'Observer Pattern: Notify users when expenses are added or settled',
        'Facade Pattern: ExpenseManager provides unified API for all operations'
      ],

      implementation: `from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, List
from collections import defaultdict

class SplitType(Enum):
    EQUAL = 'equal'
    EXACT = 'exact'
    PERCENTAGE = 'percentage'

class User:
    def __init__(self, user_id: str, name: str):
        self.user_id = user_id
        self.name = name

class Split(ABC):
    def __init__(self, user: User):
        self.user = user
        self.amount = 0.0

    @abstractmethod
    def set_amount(self, total: float, **kwargs):
        pass

class EqualSplit(Split):
    def set_amount(self, total: float, **kwargs):
        num_users = kwargs.get('num_users', 1)
        self.amount = round(total / num_users, 2)

class ExactSplit(Split):
    def set_amount(self, total: float, **kwargs):
        self.amount = kwargs.get('exact_amount', 0.0)

class Expense:
    def __init__(self, expense_id: str, paid_by: User, amount: float, splits: List[Split]):
        self.expense_id = expense_id
        self.paid_by = paid_by
        self.amount = amount
        self.splits = splits

class BalanceSheet:
    def __init__(self):
        # balance[A][B] > 0 means B owes A
        self.balance: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))

    def add_expense(self, expense: Expense):
        for split in expense.splits:
            if split.user.user_id == expense.paid_by.user_id:
                continue
            payer = expense.paid_by.user_id
            debtor = split.user.user_id
            self.balance[payer][debtor] += split.amount
            self.balance[debtor][payer] -= split.amount

    def get_balance(self, user_id: str) -> Dict[str, float]:
        return {uid: amt for uid, amt in self.balance[user_id].items() if amt != 0}

    def simplify_debts(self) -> List[tuple]:
        """Minimize number of transactions to settle all debts"""
        net = defaultdict(float)
        for user, balances in self.balance.items():
            for other, amount in balances.items():
                net[user] += amount

        creditors = [(amt, uid) for uid, amt in net.items() if amt > 0]
        debtors = [(-amt, uid) for uid, amt in net.items() if amt < 0]
        creditors.sort(reverse=True)
        debtors.sort(reverse=True)

        transactions = []
        i, j = 0, 0
        while i < len(creditors) and j < len(debtors):
            credit_amt, creditor = creditors[i]
            debt_amt, debtor = debtors[j]
            settle = min(credit_amt, debt_amt)
            transactions.append((debtor, creditor, round(settle, 2)))
            creditors[i] = (credit_amt - settle, creditor)
            debtors[j] = (debt_amt - settle, debtor)
            if creditors[i][0] == 0: i += 1
            if debtors[j][0] == 0: j += 1

        return transactions`,

      functionalRequirements: [
        'Add expenses paid by one user, split among multiple participants',
        'Support equal, exact amount, and percentage-based splits',
        'Track net balances between all pairs of users',
        'Simplify debts to minimize the number of settlement transactions',
        'Support group creation for organizing shared expenses',
        'Show balance summary for each user (who owes whom and how much)'
      ],

      nonFunctionalRequirements: [
        'Handle floating-point precision for monetary calculations',
        'Validate that split amounts sum to the total expense amount',
        'Support concurrent expense additions in group settings',
        'Maintain audit trail of all expenses for dispute resolution'
      ],

      keyQuestions: [
        {
          question: 'Why use net balances instead of storing every individual transaction?',
          answer: 'Net balances between pairs of users reduce storage from O(T) where T is the number of transactions to O(U^2) where U is the number of users. More importantly, net balances make it trivial to answer "how much does A owe B?" in O(1) time. Individual transaction storage would require aggregating all transactions between two users to compute the net amount. Net balances also simplify the debt simplification algorithm since you only need to work with the final net amounts. The tradeoff is losing the transaction history, so in practice you would store both: net balances for quick lookups and individual expenses for audit purposes.'
        },
        {
          question: 'How would you extend this to support recurring expenses?',
          answer: 'You would add a RecurringExpense class that stores the expense template (amount, split type, participants) along with a recurrence schedule (weekly, monthly, custom). A scheduler would create actual Expense instances from the template at each recurrence interval. The RecurringExpense would reference the Group and update the BalanceSheet each time it fires. Users should be able to pause, modify, or cancel recurring expenses. This integrates well with the existing system since each generated expense goes through the same add_expense flow, updating balances as usual.'
        },
        {
          question: 'What are the tradeoffs of the greedy debt simplification algorithm vs. optimal (NP-hard) solution?',
          answer: 'The greedy algorithm (match largest creditor with largest debtor) runs in O(U log U) time and produces at most U-1 transactions, which is near-optimal for most practical cases. The truly optimal solution (minimum number of transactions) is NP-hard and requires exploring all possible settlements. For N users, the greedy approach might produce one or two extra transactions compared to optimal, but the difference is negligible for typical group sizes (5-20 people). In practice, users also prefer settling with people they know rather than minimizing total transactions, so the greedy approach is both practical and sufficient.'
        }
      ],

      tips: [
        'Model split types using the Strategy Pattern: EqualSplit, ExactSplit, and PercentageSplit each implement a calculate_amount() method differently.',
        'Use a 2D defaultdict for the balance sheet where balance[A][B] represents the net amount B owes A (positive means B owes, negative means A owes).',
        'Validate splits: for ExactSplit, the sum of exact amounts must equal the total; for PercentageSplit, percentages must sum to 100.',
        'Round monetary values to 2 decimal places and handle rounding differences by assigning the remainder to the first participant.',
        'The debt simplification algorithm computes net balances per user (sum all debts and credits), then greedily matches the largest creditor with the largest debtor until all balances are zero.'
      ]
    },
    {
      id: 'circular-queue',
      isNew: true,
      title: 'Design Circular Queue',
      subtitle: 'Ring Buffer',
      icon: 'refreshCw',
      color: '#6366f1',
      difficulty: 'Easy',
      description: 'Design a circular queue (ring buffer) with fixed capacity using an array.',

      introduction: `A circular queue (ring buffer) is a fixed-size data structure that wraps around when the end is reached. It is widely used in operating systems (keyboard buffers), networking (packet queues), producer-consumer patterns, and audio/video streaming. It is a common LLD interview question because it tests fundamental understanding of array manipulation, pointer arithmetic, and edge case handling.

This problem tests your understanding of modular arithmetic for index wrapping, the distinction between full and empty states (a subtle but critical edge case), and memory-efficient design without dynamic allocation. From an OOP perspective, it demonstrates encapsulation (hiding the internal array and pointer management behind a clean API), the Sentinel Pattern (using a size counter to distinguish full from empty), and the Interface Segregation Principle (the queue exposes only enqueue, dequeue, peek, isEmpty, and isFull).

The key insight is using modular arithmetic with front and rear pointers to efficiently reuse array space without shifting elements. When the rear pointer reaches the end of the array, it wraps around to the beginning using (rear + 1) % capacity. The tricky part is distinguishing between full and empty states since both could have front == rear. Using a separate size counter is the cleanest solution, though alternatives include wasting one slot or using a boolean flag.`,

      coreEntities: [
        { name: 'CircularQueue<T>', description: 'Main class with fixed-size array, front pointer, rear pointer, and size counter' },
        { name: 'Front Pointer', description: 'Index of the first element in the queue' },
        { name: 'Rear Pointer', description: 'Index of the next insertion position' }
      ],

      designPatterns: [
        'Ring Buffer Pattern: Modular arithmetic for index wrapping',
        'Sentinel Pattern: Use size counter to distinguish full vs empty states'
      ],

      implementation: `class CircularQueue:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.queue = [None] * capacity
        self.front = 0
        self.rear = 0
        self.size = 0

    def enqueue(self, value) -> bool:
        if self.is_full():
            return False
        self.queue[self.rear] = value
        self.rear = (self.rear + 1) % self.capacity
        self.size += 1
        return True

    def dequeue(self):
        if self.is_empty():
            return None
        value = self.queue[self.front]
        self.queue[self.front] = None
        self.front = (self.front + 1) % self.capacity
        self.size -= 1
        return value

    def peek(self):
        if self.is_empty():
            return None
        return self.queue[self.front]

    def is_empty(self) -> bool:
        return self.size == 0

    def is_full(self) -> bool:
        return self.size == self.capacity

    def __len__(self) -> int:
        return self.size`,

      functionalRequirements: [
        'enqueue(value): Add element to the rear of the queue',
        'dequeue(): Remove and return element from the front',
        'peek(): View the front element without removing it',
        'isEmpty(): Check if the queue has no elements',
        'isFull(): Check if the queue has reached capacity',
        'Fixed capacity set at construction time'
      ],

      nonFunctionalRequirements: [
        'O(1) time complexity for all operations',
        'O(n) space complexity where n is the capacity',
        'No dynamic memory allocation after construction',
        'Correctly distinguish between full and empty states'
      ],

      keyQuestions: [
        {
          question: 'Why use a size counter instead of comparing front == rear to detect full vs. empty?',
          answer: 'When front == rear, the queue could be either completely empty or completely full -- the pointers alone cannot distinguish these states. Three common solutions exist: (1) a size counter that tracks the current number of elements, (2) wasting one array slot so the queue is full when (rear + 1) % capacity == front, or (3) a boolean isFull flag. The size counter approach is cleanest because it provides O(1) size queries, simplifies the isFull/isEmpty logic, and does not waste any array space. The tradeoff is maintaining an extra integer, which is negligible in practice.'
        },
        {
          question: 'How would you extend this to be thread-safe for a producer-consumer pattern?',
          answer: 'You would add a mutex lock and two condition variables: not_full (signaled when space becomes available) and not_empty (signaled when data becomes available). The enqueue method acquires the lock, waits on not_full if the queue is full, inserts the element, and signals not_empty. The dequeue method acquires the lock, waits on not_empty if the queue is empty, removes the element, and signals not_full. This is the classic bounded buffer problem. For higher performance, you could use a lock-free ring buffer with atomic compare-and-swap operations on the front and rear pointers.'
        },
        {
          question: 'What are the tradeoffs of a circular queue vs. a dynamic queue backed by a linked list?',
          answer: 'A circular queue has fixed capacity with O(1) operations and excellent cache locality since elements are contiguous in memory. A linked list queue has dynamic capacity but O(1) operations require memory allocation per enqueue (which can be slow and cause fragmentation). The circular queue is preferred when the maximum size is known and bounded (e.g., network packet buffers, audio sample buffers). The linked list queue is preferred when the size is unpredictable and memory allocation overhead is acceptable. In practice, many systems use a hybrid: a circular queue with dynamic resizing when full.'
        }
      ],

      tips: [
        'Always use modular arithmetic (% capacity) for both front and rear pointer advancement to handle wraparound correctly.',
        'Use a size counter rather than wasting an array slot -- it provides O(1) size queries and is cleaner to implement.',
        'Set dequeued slots to None to help with garbage collection and make debugging easier when inspecting the internal array.',
        'Consider what enqueue should do when full: return False (as shown), throw an exception, or overwrite the oldest element (overwrite mode is useful for logging buffers).',
        'Test edge cases: enqueue into full queue, dequeue from empty queue, wrap-around after many enqueue/dequeue cycles, and single-element queue.'
      ]
    },
    {
      id: 'library-management-lld',
      isNew: true,
      title: 'Library Management System',
      subtitle: 'Book Lending Platform',
      icon: 'book',
      color: '#a855f7',
      difficulty: 'Medium',
      description: 'Design a library management system for book catalog, member management, borrowing, and reservations.',

      introduction: `A library management system handles book cataloging, member registration, borrowing/returning books, and reservation queues. It is a classic OOP design problem that tests your ability to model real-world entities and their relationships. It is commonly asked because the domain is familiar and the design involves a rich set of entities with complex interactions.

This problem tests your understanding of the Singleton Pattern for the Library instance, the Strategy Pattern for pluggable fine calculation policies (different rates for students vs. faculty), the Observer Pattern for notifying members when reserved books become available, and the Factory Pattern for creating different member types. It also tests your grasp of the distinction between a Book (metadata) and a BookCopy (physical instance), which is a key modeling insight that demonstrates understanding of entity vs. value object separation.

The key design challenge is managing the reservation queue when all copies of a book are checked out. When a copy is returned, the system must automatically notify the next member in the reservation queue and hold the book for them. This requires careful coordination between the return_book, reservation, and checkout flows, with proper handling of expired reservations and members who no longer want the book.`,

      coreEntities: [
        { name: 'Library', description: 'Singleton managing all operations, holds catalogs and member lists' },
        { name: 'Book', description: 'Book metadata: ISBN, title, author, category' },
        { name: 'BookCopy', description: 'Physical copy of a book with availability status' },
        { name: 'Member', description: 'Library member with borrowing history and active loans' },
        { name: 'Loan', description: 'Tracks borrowed copy, member, dates, and fine' },
        { name: 'Reservation', description: 'Queue entry when all copies are checked out' },
        { name: 'FineCalculator', description: 'Strategy for computing overdue fines' }
      ],

      designPatterns: [
        'Singleton Pattern: Single Library instance managing state',
        'Strategy Pattern: Pluggable fine calculation policies',
        'Observer Pattern: Notify members when reserved book becomes available',
        'Factory Pattern: Create different member types (student, faculty)'
      ],

      implementation: `from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional
from collections import deque

class BookStatus(Enum):
    AVAILABLE = 'available'
    CHECKED_OUT = 'checked_out'
    RESERVED = 'reserved'

class Book:
    def __init__(self, isbn: str, title: str, author: str):
        self.isbn = isbn
        self.title = title
        self.author = author
        self.copies: List['BookCopy'] = []

class BookCopy:
    def __init__(self, copy_id: str, book: Book):
        self.copy_id = copy_id
        self.book = book
        self.status = BookStatus.AVAILABLE
        self.current_loan: Optional['Loan'] = None

class Member:
    def __init__(self, member_id: str, name: str, max_books: int = 5):
        self.member_id = member_id
        self.name = name
        self.max_books = max_books
        self.active_loans: List['Loan'] = []

    def can_borrow(self) -> bool:
        return len(self.active_loans) < self.max_books

class Loan:
    def __init__(self, copy: BookCopy, member: Member, duration_days: int = 14):
        self.copy = copy
        self.member = member
        self.checkout_date = datetime.now()
        self.due_date = self.checkout_date + timedelta(days=duration_days)
        self.return_date: Optional[datetime] = None

    def calculate_fine(self, rate_per_day: float = 0.50) -> float:
        if self.return_date and self.return_date > self.due_date:
            overdue_days = (self.return_date - self.due_date).days
            return overdue_days * rate_per_day
        return 0.0

class Library:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.books: Dict[str, Book] = {}
        self.members: Dict[str, Member] = {}
        self.reservations: Dict[str, deque] = {}  # isbn -> queue of member_ids

    def checkout(self, isbn: str, member_id: str) -> Optional[Loan]:
        book = self.books.get(isbn)
        member = self.members.get(member_id)
        if not book or not member or not member.can_borrow():
            return None

        for copy in book.copies:
            if copy.status == BookStatus.AVAILABLE:
                copy.status = BookStatus.CHECKED_OUT
                loan = Loan(copy, member)
                copy.current_loan = loan
                member.active_loans.append(loan)
                return loan
        return None  # No copies available

    def return_book(self, copy_id: str) -> float:
        for book in self.books.values():
            for copy in book.copies:
                if copy.copy_id == copy_id and copy.current_loan:
                    loan = copy.current_loan
                    loan.return_date = datetime.now()
                    fine = loan.calculate_fine()
                    loan.member.active_loans.remove(loan)
                    copy.status = BookStatus.AVAILABLE
                    copy.current_loan = None
                    # Check reservations
                    isbn = copy.book.isbn
                    if isbn in self.reservations and self.reservations[isbn]:
                        next_member_id = self.reservations[isbn].popleft()
                        self.checkout(isbn, next_member_id)
                    return fine
        return 0.0`,

      functionalRequirements: [
        'Add and catalog books with ISBN, title, author, and category',
        'Register members with borrowing limits based on membership type',
        'Checkout available book copies to eligible members',
        'Return books with automatic fine calculation for overdue items',
        'Reserve books when all copies are checked out',
        'Search books by title, author, ISBN, or category',
        'Notify next member in reservation queue when a book becomes available'
      ],

      nonFunctionalRequirements: [
        'Thread-safe checkout to prevent double-lending of the same copy',
        'Support different fine rates for different member types',
        'Handle multiple copies of the same book independently',
        'Maintain audit trail of all borrowing transactions'
      ],

      keyQuestions: [
        {
          question: 'Why distinguish between Book and BookCopy as separate entities?',
          answer: 'A Book represents the abstract metadata (ISBN, title, author) while a BookCopy represents a physical instance that can be checked out. A library typically has multiple copies of popular books, each with its own status (available, checked out, damaged). Without this distinction, you cannot track which specific copy a member has, handle different conditions per copy, or know how many copies remain available. This is a fundamental OOP modeling concept: Book is a catalog entity while BookCopy is a trackable physical item. The relationship is one-to-many: one Book has many BookCopies.'
        },
        {
          question: 'How would you extend this to support different member types with different borrowing privileges?',
          answer: 'Create a MemberType enum or abstract Member class with subclasses like StudentMember (max 3 books, 14-day loan), FacultyMember (max 10 books, 30-day loan), and PremiumMember (max 5 books, 21-day loan, no late fees). Each subclass defines its max_books, loan_duration, and fine_rate. The checkout method checks member.can_borrow() which considers both the current loan count and the member-specific limit. Use the Factory Pattern to create appropriate member instances based on type. The fine calculation uses the Strategy Pattern with a policy determined by member type.'
        },
        {
          question: 'What are the tradeoffs of using a reservation queue vs. a notification-based system?',
          answer: 'A reservation queue (FIFO) guarantees fairness: the first person to reserve gets the book first. But the reserved member might not come to pick it up, blocking everyone behind them. A notification-based system alerts all interested members simultaneously and the first to arrive gets the book. This is faster but unfair to those who reserved earlier. The best approach combines both: a reservation queue with a timeout (e.g., 48 hours to pick up), after which the reservation expires and the next person in queue is notified. This balances fairness with efficiency.'
        }
      ],

      tips: [
        'Always model Book and BookCopy separately -- this is a key design distinction that interviewers look for.',
        'Use a deque (queue) for reservations per ISBN so that the first person to reserve gets priority when a copy becomes available.',
        'Implement fine calculation as a Strategy so that different member types or time periods can have different rates.',
        'The checkout operation should be atomic: check availability, mark copy as checked out, and create the Loan record in one synchronized block.',
        'Consider adding a Librarian role that can override rules (waive fines, extend loans) to demonstrate role-based access in your design.'
      ]
    },
    {
      id: 'locker-allocation',
      isNew: true,
      title: 'Locker Allocation System',
      subtitle: 'Package Delivery Lockers',
      icon: 'lock',
      color: '#c2410c',
      difficulty: 'Medium',
      description: 'Design a locker allocation system for package delivery with different locker sizes.',

      introduction: `A locker allocation system (like Amazon Lockers or InPost) assigns available lockers to packages based on size compatibility. It is a practical LLD question asked at Amazon, Walmart, and logistics companies because it involves real-world resource allocation with constraints. The system must efficiently match packages to the smallest available locker, handle timeouts for uncollected packages, and support concurrent access from multiple delivery drivers.

This problem tests your understanding of the Strategy Pattern for allocation algorithms (best-fit, first-fit), the State Pattern for locker lifecycle (EMPTY, OCCUPIED, EXPIRED), the Observer Pattern for notifying recipients when packages are delivered, and the Factory Pattern for generating unique access codes. It also tests thread safety since multiple delivery drivers may try to allocate lockers simultaneously, and resource management through timeout-based cleanup.

The key design challenge is the allocation strategy: always assign the smallest locker that fits the package to maximize overall utilization. A best-fit approach sorts available lockers by size and picks the smallest compatible one. This prevents small packages from occupying large lockers that might be needed for bigger packages later. The system must also handle timeout-based expiration, releasing lockers for uncollected packages and potentially notifying the sender for return processing.`,

      coreEntities: [
        { name: 'LockerSystem', description: 'Main controller managing all lockers and allocations' },
        { name: 'Locker', description: 'Individual locker with size, status, and access code' },
        { name: 'LockerSize (Enum)', description: 'SMALL, MEDIUM, LARGE, XLARGE' },
        { name: 'Package', description: 'Package with dimensions and assigned locker' },
        { name: 'Allocation', description: 'Tracks package-locker assignment with expiry time' },
        { name: 'AllocationStrategy', description: 'Interface for different allocation algorithms' }
      ],

      designPatterns: [
        'Strategy Pattern: Different allocation strategies (best-fit, first-fit)',
        'Observer Pattern: Notify recipient when package is delivered',
        'State Pattern: Locker states (EMPTY, OCCUPIED, EXPIRED)',
        'Factory Pattern: Generate unique access codes'
      ],

      implementation: `from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from threading import Lock
import random
import string

class LockerSize(Enum):
    SMALL = 1
    MEDIUM = 2
    LARGE = 3
    XLARGE = 4

class LockerStatus(Enum):
    EMPTY = 'empty'
    OCCUPIED = 'occupied'
    EXPIRED = 'expired'

class Locker:
    def __init__(self, locker_id: str, size: LockerSize):
        self.locker_id = locker_id
        self.size = size
        self.status = LockerStatus.EMPTY
        self.access_code: Optional[str] = None
        self.lock = Lock()

class Package:
    def __init__(self, package_id: str, size: LockerSize):
        self.package_id = package_id
        self.size = size

class Allocation:
    def __init__(self, package: Package, locker: Locker, hours: int = 72):
        self.package = package
        self.locker = locker
        self.access_code = ''.join(random.choices(string.digits, k=6))
        self.created_at = datetime.now()
        self.expires_at = self.created_at + timedelta(hours=hours)

    def is_expired(self) -> bool:
        return datetime.now() > self.expires_at

class LockerSystem:
    def __init__(self):
        self.lockers: Dict[str, Locker] = {}
        self.allocations: Dict[str, Allocation] = {}  # package_id -> Allocation
        self.lock = Lock()

    def add_locker(self, locker: Locker):
        self.lockers[locker.locker_id] = locker

    def allocate(self, package: Package) -> Optional[Allocation]:
        with self.lock:
            # Best-fit: find smallest available locker that fits
            candidates = [
                l for l in self.lockers.values()
                if l.status == LockerStatus.EMPTY and l.size.value >= package.size.value
            ]
            candidates.sort(key=lambda l: l.size.value)

            if not candidates:
                return None

            locker = candidates[0]
            locker.status = LockerStatus.OCCUPIED
            allocation = Allocation(package, locker)
            locker.access_code = allocation.access_code
            self.allocations[package.package_id] = allocation
            return allocation

    def pickup(self, package_id: str, code: str) -> bool:
        allocation = self.allocations.get(package_id)
        if not allocation or allocation.access_code != code:
            return False
        self._release_locker(allocation.locker)
        del self.allocations[package_id]
        return True

    def _release_locker(self, locker: Locker):
        locker.status = LockerStatus.EMPTY
        locker.access_code = None

    def cleanup_expired(self):
        with self.lock:
            expired = [pid for pid, a in self.allocations.items() if a.is_expired()]
            for pid in expired:
                self._release_locker(self.allocations[pid].locker)
                del self.allocations[pid]`,

      functionalRequirements: [
        'Allocate the smallest available locker that fits a given package size',
        'Generate unique access codes for package pickup',
        'Release lockers when packages are picked up with valid access code',
        'Automatically expire allocations after a configurable timeout period',
        'Support multiple locker sizes: SMALL, MEDIUM, LARGE, XLARGE',
        'Track all active allocations and their expiry times'
      ],

      nonFunctionalRequirements: [
        'Thread-safe allocation to prevent double-assignment of lockers',
        'O(n) allocation time where n is the number of lockers (sortable for best-fit)',
        'Periodic cleanup of expired allocations',
        'Secure access codes that are not easily guessable'
      ],

      keyQuestions: [
        {
          question: 'Why use best-fit allocation instead of first-fit for locker assignment?',
          answer: 'Best-fit assigns the smallest locker that can accommodate the package, minimizing wasted space. If a small package takes a large locker (first-fit might do this), a subsequent large package may find no locker available even though small lockers are free. Best-fit maximizes overall utilization by preserving larger lockers for larger packages. The tradeoff is that best-fit requires sorting or scanning all available lockers (O(n log n) or O(n)), while first-fit can stop at the first compatible locker. For a locker system with hundreds of lockers, the performance difference is negligible, making best-fit the clear winner.'
        },
        {
          question: 'How would you extend this to support multi-package orders in adjacent lockers?',
          answer: 'You would add a BulkAllocation class that finds a contiguous group of lockers of the required sizes. The LockerSystem would need a spatial awareness feature, knowing which lockers are physically adjacent. You could model lockers in a grid (row, column) and add a findAdjacentGroup() method. Alternatively, for non-contiguous multi-package orders, create an OrderAllocation that groups multiple individual Allocations under a single access code. The pickup method would release all lockers in the order when the code is verified. This requires extending the Allocation model but does not change the core locker management logic.'
        },
        {
          question: 'What are the tradeoffs of periodic cleanup vs. lazy expiration for timed-out packages?',
          answer: 'Periodic cleanup (a scheduled job that scans all allocations) is simple and predictable but may leave expired packages in lockers between cleanup runs, reducing availability. Lazy expiration checks if an allocation is expired only when the locker is requested for a new package, which is more responsive but means expired allocations are not cleaned up until demand exists. The best approach combines both: lazy expiration during allocation (check and release expired lockers when looking for available ones) plus periodic cleanup as a safety net. This ensures no expired allocation persists indefinitely while also responding quickly to demand.'
        }
      ],

      tips: [
        'Model LockerSize as an enum with integer values (SMALL=1, MEDIUM=2, etc.) so that size comparison uses simple integer comparison.',
        'Use a global lock for the allocate() method to prevent two delivery drivers from being assigned the same locker simultaneously.',
        'Generate access codes using cryptographically random numbers rather than sequential IDs to prevent guessing attacks.',
        'Separate the allocation strategy into its own class (BestFitStrategy, FirstFitStrategy) so the LockerSystem can be configured with different strategies.',
        'Consider adding notification support: send SMS/email to the recipient when a package is delivered, and to the sender when a package expires uncollected.'
      ]
    },
    {
      id: 'queue-using-array',
      isNew: true,
      title: 'Implement Queue using Array',
      subtitle: 'Array-Based Queue',
      icon: 'layers',
      color: '#0284c7',
      difficulty: 'Easy',
      description: 'Implement a queue data structure using a fixed-size array with enqueue, dequeue, and peek operations.',

      introduction: `Implementing a queue using an array is a fundamental data structure exercise and a staple of LLD interviews. The naive approach of using a linear array wastes space as elements are dequeued from the front, because those positions can never be reused. This problem tests whether you recognize this issue and apply the circular array (ring buffer) technique for efficient space utilization.

From an OOP perspective, this problem tests encapsulation (hiding the internal array and pointer management), clean API design (enqueue, dequeue, peek, isEmpty, isFull), and understanding of the Liskov Substitution Principle (your ArrayQueue should be usable anywhere a generic Queue interface is expected). It also demonstrates the importance of choosing the right data structure representation and handling edge cases around full and empty states.

The key insight is using two pointers (front and rear) with modular arithmetic to wrap around the array, creating a ring buffer that reuses freed space without ever shifting elements. This gives O(1) time complexity for all operations and O(n) fixed space. The design is identical to a circular queue but emphasizes that the underlying storage is a plain array with clever index management.`,

      coreEntities: [
        { name: 'ArrayQueue<T>', description: 'Queue backed by fixed-size array with front and rear indices' },
        { name: 'Front Index', description: 'Points to the first element to be dequeued' },
        { name: 'Rear Index', description: 'Points to the next empty slot for enqueue' }
      ],

      designPatterns: [
        'Ring Buffer Pattern: Circular index wrapping using modulo',
        'Fixed Capacity Pattern: Bounded queue with overflow handling'
      ],

      implementation: `class ArrayQueue:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.array = [None] * capacity
        self.front = 0
        self.rear = 0
        self.size = 0

    def enqueue(self, item) -> bool:
        if self.is_full():
            return False  # or raise exception
        self.array[self.rear] = item
        self.rear = (self.rear + 1) % self.capacity
        self.size += 1
        return True

    def dequeue(self):
        if self.is_empty():
            raise IndexError("Queue is empty")
        item = self.array[self.front]
        self.array[self.front] = None
        self.front = (self.front + 1) % self.capacity
        self.size -= 1
        return item

    def peek(self):
        if self.is_empty():
            raise IndexError("Queue is empty")
        return self.array[self.front]

    def is_empty(self) -> bool:
        return self.size == 0

    def is_full(self) -> bool:
        return self.size == self.capacity

    def __len__(self) -> int:
        return self.size

    def __str__(self) -> str:
        if self.is_empty():
            return "[]"
        items = []
        idx = self.front
        for _ in range(self.size):
            items.append(str(self.array[idx]))
            idx = (idx + 1) % self.capacity
        return "[" + ", ".join(items) + "]"`,

      functionalRequirements: [
        'enqueue(item): Add an element to the rear of the queue',
        'dequeue(): Remove and return the element at the front',
        'peek(): Return the front element without removing it',
        'isEmpty(): Check if the queue contains no elements',
        'isFull(): Check if the queue has reached its fixed capacity',
        'Support a __str__ method for debugging queue contents'
      ],

      nonFunctionalRequirements: [
        'O(1) time complexity for all operations',
        'Fixed O(n) memory allocation at construction time',
        'No element shifting on dequeue operations',
        'Correct wraparound behavior after many enqueue/dequeue cycles'
      ],

      keyQuestions: [
        {
          question: 'Why is a circular approach necessary instead of a simple linear array?',
          answer: 'In a linear array queue, dequeue removes the front element and advances the front pointer. Over time, the front moves towards the end of the array, leaving unused space at the beginning that can never be reclaimed. After n dequeues, the entire array is wasted even if the queue is logically empty. The circular approach reuses this space by wrapping the rear pointer back to the beginning using modular arithmetic. This provides constant space utilization regardless of how many total operations have been performed. Without this technique, you would need to periodically shift all elements to the front, which is O(n).'
        },
        {
          question: 'How would you modify this to support dynamic resizing when the queue is full?',
          answer: 'When isFull() is true and a new enqueue is requested, allocate a new array with double the capacity. Copy all elements from the old array starting at the front pointer, unwrapping the circular order into a linear layout in the new array (iterate from front for size elements). Reset front to 0 and rear to size. This amortized doubling gives O(1) amortized enqueue time, similar to how dynamic arrays (ArrayList) work. You could also support shrinking when the queue drops below 25% capacity to reclaim memory, though this adds complexity and is optional.'
        },
        {
          question: 'What are the tradeoffs of throwing an exception vs. returning a sentinel value for dequeue on empty?',
          answer: 'Throwing an exception (like IndexError) makes the error explicit and forces the caller to handle it, which is safer and follows the fail-fast principle. Returning a sentinel value (like None or -1) avoids exception overhead and simplifies caller code, but risks silent bugs if the caller forgets to check the return value. The best practice depends on the language: Java collections throw NoSuchElementException, while C++ STL returns undefined behavior. A hybrid approach offers both: dequeue() throws on empty, while tryDequeue() returns Optional/None. This gives callers a choice based on their needs.'
        }
      ],

      tips: [
        'The core formula is: next_index = (current_index + 1) % capacity -- use this consistently for both front and rear advancement.',
        'Use a size counter to track the number of elements rather than trying to derive it from front and rear positions.',
        'Null out dequeued positions (self.array[self.front] = None) to help garbage collection and make debugging easier.',
        'Implement __str__ or toString for debugging -- iterate from front for size elements, wrapping with modulo, to show logical order.',
        'Test the wraparound case explicitly: fill the queue, dequeue half, enqueue more to trigger the rear pointer wrapping past the array end.'
      ]
    },
    {
      id: 'memory-allocator',
      isNew: true,
      title: 'Memory Allocator',
      subtitle: 'Dynamic Memory Management',
      icon: 'cpu',
      color: '#be123c',
      difficulty: 'Hard',
      description: 'Design a memory allocator that manages a contiguous block of memory with malloc and free operations.',

      introduction: `A memory allocator manages a contiguous block of memory, handling allocation and deallocation requests. This is one of the most systems-oriented LLD problems and is frequently asked at companies building operating systems, databases, and embedded systems. It tests your understanding of memory management, fragmentation, and allocation strategies -- concepts that underpin malloc/free in C and memory pools in high-performance applications.

This problem tests your understanding of the Strategy Pattern for allocation algorithms (first-fit, best-fit, worst-fit), the Free List pattern for tracking available memory blocks, and the Coalescing pattern for merging adjacent free blocks to combat fragmentation. It also tests the Single Responsibility Principle by separating allocation logic from the free list management and coalescing logic. The doubly linked list of blocks naturally supports O(1) merging with neighbors.

The key challenges are minimizing fragmentation (both internal -- allocated block is larger than requested -- and external -- free memory exists but is not contiguous), choosing the right allocation strategy, and efficiently coalescing freed blocks with their neighbors. The free list, implemented as a doubly linked list sorted by address, enables O(1) coalescing by checking the previous and next blocks during deallocation.`,

      coreEntities: [
        { name: 'MemoryAllocator', description: 'Main class managing memory pool and free list' },
        { name: 'Block', description: 'Memory block with start address, size, and allocation status' },
        { name: 'FreeList', description: 'Linked list of available memory blocks sorted by address' },
        { name: 'AllocationStrategy', description: 'Interface for first-fit, best-fit, worst-fit algorithms' }
      ],

      designPatterns: [
        'Strategy Pattern: Pluggable allocation algorithms (first-fit, best-fit)',
        'Free List Pattern: Linked list of available blocks for O(n) allocation',
        'Coalescing Pattern: Merge adjacent free blocks to reduce fragmentation'
      ],

      implementation: `class Block:
    def __init__(self, start: int, size: int):
        self.start = start
        self.size = size
        self.is_free = True
        self.next = None
        self.prev = None

class MemoryAllocator:
    def __init__(self, total_size: int):
        self.total_size = total_size
        self.head = Block(0, total_size)
        self.allocated = {}  # start_address -> Block

    def malloc(self, size: int) -> int:
        """Allocate memory using first-fit strategy. Returns start address or -1."""
        block = self.head
        while block:
            if block.is_free and block.size >= size:
                return self._allocate(block, size)
            block = block.next
        return -1  # Out of memory

    def _allocate(self, block: Block, size: int) -> int:
        if block.size > size:
            # Split block: allocate 'size' from start, remainder stays free
            remainder = Block(block.start + size, block.size - size)
            remainder.next = block.next
            remainder.prev = block
            if block.next:
                block.next.prev = remainder
            block.next = remainder
            block.size = size

        block.is_free = False
        self.allocated[block.start] = block
        return block.start

    def free(self, address: int) -> bool:
        """Free allocated memory at given address."""
        block = self.allocated.get(address)
        if not block:
            return False

        block.is_free = True
        del self.allocated[address]
        self._coalesce(block)
        return True

    def _coalesce(self, block: Block):
        """Merge adjacent free blocks."""
        # Merge with next block
        if block.next and block.next.is_free:
            next_block = block.next
            block.size += next_block.size
            block.next = next_block.next
            if next_block.next:
                next_block.next.prev = block

        # Merge with previous block
        if block.prev and block.prev.is_free:
            prev_block = block.prev
            prev_block.size += block.size
            prev_block.next = block.next
            if block.next:
                block.next.prev = prev_block`,

      functionalRequirements: [
        'malloc(size): Allocate a contiguous block of given size, return start address',
        'free(address): Deallocate a previously allocated block',
        'Automatically split oversized blocks to reduce internal fragmentation',
        'Coalesce adjacent free blocks on deallocation to reduce external fragmentation',
        'Track allocation metadata (start address, size, status)'
      ],

      nonFunctionalRequirements: [
        'O(n) allocation time for first-fit (n = number of free blocks)',
        'O(1) deallocation and coalescing with a doubly linked list',
        'Minimize both internal and external fragmentation',
        'Thread-safe for concurrent allocation/deallocation'
      ],

      keyQuestions: [
        {
          question: 'Why is first-fit generally preferred over best-fit for memory allocation?',
          answer: 'First-fit scans the free list and allocates from the first block that is large enough, giving O(n) worst case but often finding a fit quickly near the beginning. Best-fit scans the entire free list to find the smallest block that fits, always taking O(n) time. While best-fit minimizes wasted space per allocation, it tends to create many tiny unusable fragments (external fragmentation). First-fit distributes allocations more evenly and creates fewer tiny fragments. In practice, first-fit with address-ordered free lists provides the best balance of speed and fragmentation. However, best-fit is better when allocation sizes vary widely.'
        },
        {
          question: 'How would you extend this to support memory pools for fixed-size allocations?',
          answer: 'Create a MemoryPool class that pre-divides a memory region into fixed-size blocks. Allocation returns any free block in O(1) using a free list (stack of available block addresses). Deallocation pushes the block back onto the free list in O(1). There is zero fragmentation since all blocks are the same size. This is ideal for allocating many objects of the same type (e.g., network packets, tree nodes). You can have multiple pools for different sizes (slab allocator pattern). The MemoryAllocator would delegate to the appropriate pool based on request size and fall back to the general allocator for unusual sizes.'
        },
        {
          question: 'What are the tradeoffs of coalescing immediately on free vs. deferred coalescing?',
          answer: 'Immediate coalescing merges freed blocks with their neighbors right away, keeping the free list optimally defragmented. This is O(1) with a doubly linked list but adds overhead to every free() call. Deferred coalescing postpones merging until a malloc fails or a periodic compaction runs. This makes free() faster but can temporarily leave the free list fragmented, causing larger allocations to fail even when enough total memory is available. Immediate coalescing is preferred for general-purpose allocators because it prevents fragmentation accumulation. Deferred coalescing is used in performance-critical paths where free() latency matters more than allocation success rate.'
        }
      ],

      tips: [
        'Use a doubly linked list for the block list so that coalescing with previous and next neighbors is O(1) without scanning.',
        'The split operation creates a new free block from the remainder when an allocated block is larger than requested -- always check if the remainder is large enough to be useful.',
        'Store allocation metadata (start address -> Block mapping) in a separate HashMap for O(1) lookup during free() instead of scanning the block list.',
        'Discuss fragmentation explicitly: internal fragmentation (block is larger than needed) and external fragmentation (free blocks are scattered and cannot satisfy large requests).',
        'Mention alignment: real memory allocators round up allocation sizes to alignment boundaries (typically 8 or 16 bytes) for CPU efficiency.'
      ]
    },
    {
      id: 'rock-paper-scissors',
      isNew: true,
      title: 'Rock Paper Scissors',
      subtitle: 'Hand Game',
      icon: 'gamepad',
      color: '#15803d',
      difficulty: 'Easy',
      description: 'Design the Rock Paper Scissors game with player turns, win detection, and match scoring.',

      introduction: `Rock Paper Scissors is a simple game that demonstrates clean OOP design with enums, strategy pattern for AI opponents, and game state management. It is a great LLD warm-up question because the rules are universally known, allowing interviewers to focus on design quality rather than domain explanation. The game supports player vs player and player vs computer modes.

This problem tests your use of the Enum Pattern (moves with built-in comparison logic via a beats() method), the Strategy Pattern for AI opponents (random, pattern-based, weighted strategies), the Template Method for the game loop, and the Open/Closed Principle for extensibility. The win logic follows a circular pattern that can be elegantly modeled using modular arithmetic or a wins-against mapping.

The key design insight is making the game extensible to variants like Rock-Paper-Scissors-Lizard-Spock without modifying existing code. By defining win relationships in a configurable mapping (e.g., ROCK beats [SCISSORS, LIZARD]) rather than hardcoding them in the beats() method, you can add new moves by simply extending the mapping. This demonstrates the Open/Closed Principle and is the type of extensibility discussion that impresses interviewers.`,

      coreEntities: [
        { name: 'Move (Enum)', description: 'ROCK, PAPER, SCISSORS with beats() method' },
        { name: 'Player (Abstract)', description: 'Base class for HumanPlayer and ComputerPlayer' },
        { name: 'ComputerPlayer', description: 'AI opponent with random or strategic move selection' },
        { name: 'Round', description: 'Single round result with both moves and outcome' },
        { name: 'Game', description: 'Manages rounds, scoring, and best-of-N logic' }
      ],

      designPatterns: [
        'Strategy Pattern: Different AI strategies (random, pattern-based)',
        'Enum Pattern: Moves with built-in comparison logic',
        'Template Method: Game loop with customizable rules'
      ],

      implementation: `from enum import Enum
from abc import ABC, abstractmethod
from random import choice
from typing import List, Optional

class Move(Enum):
    ROCK = 'rock'
    PAPER = 'paper'
    SCISSORS = 'scissors'

    def beats(self, other: 'Move') -> bool:
        return (
            (self == Move.ROCK and other == Move.SCISSORS) or
            (self == Move.SCISSORS and other == Move.PAPER) or
            (self == Move.PAPER and other == Move.ROCK)
        )

class Outcome(Enum):
    WIN = 'win'
    LOSE = 'lose'
    DRAW = 'draw'

class Player(ABC):
    def __init__(self, name: str):
        self.name = name
        self.score = 0

    @abstractmethod
    def make_move(self) -> Move:
        pass

class ComputerPlayer(Player):
    def make_move(self) -> Move:
        return choice(list(Move))

class HumanPlayer(Player):
    def __init__(self, name: str):
        super().__init__(name)
        self._next_move: Optional[Move] = None

    def set_move(self, move: Move):
        self._next_move = move

    def make_move(self) -> Move:
        if self._next_move is None:
            raise ValueError("No move set")
        move = self._next_move
        self._next_move = None
        return move

class Round:
    def __init__(self, move1: Move, move2: Move):
        self.move1 = move1
        self.move2 = move2

    def get_outcome(self) -> Outcome:
        if self.move1 == self.move2:
            return Outcome.DRAW
        return Outcome.WIN if self.move1.beats(self.move2) else Outcome.LOSE

class Game:
    def __init__(self, player1: Player, player2: Player, best_of: int = 3):
        self.player1 = player1
        self.player2 = player2
        self.best_of = best_of
        self.rounds: List[Round] = []
        self.wins_needed = best_of // 2 + 1

    def play_round(self) -> Round:
        m1 = self.player1.make_move()
        m2 = self.player2.make_move()
        round_result = Round(m1, m2)
        outcome = round_result.get_outcome()
        if outcome == Outcome.WIN:
            self.player1.score += 1
        elif outcome == Outcome.LOSE:
            self.player2.score += 1
        self.rounds.append(round_result)
        return round_result

    def is_over(self) -> bool:
        return (self.player1.score >= self.wins_needed or
                self.player2.score >= self.wins_needed)

    def get_winner(self) -> Optional[Player]:
        if not self.is_over():
            return None
        return self.player1 if self.player1.score > self.player2.score else self.player2`,

      functionalRequirements: [
        'Support Player vs Player and Player vs Computer modes',
        'Each round: both players select a move simultaneously',
        'Determine round outcome: Win, Lose, or Draw',
        'Track scores across rounds in a best-of-N match',
        'Declare match winner when a player reaches the required win count'
      ],

      nonFunctionalRequirements: [
        'Extensible to support game variants (Lizard-Spock)',
        'Computer player strategies should be pluggable',
        'Moves should be type-safe using enums',
        'Game state should be immutable between rounds'
      ],

      keyQuestions: [
        {
          question: 'Why define the beats() method on the Move enum instead of in the Game class?',
          answer: 'Placing the win logic directly on the Move enum follows the Information Expert principle: the Move is the entity that knows its own winning relationships. This keeps the Game class focused on orchestrating rounds and tracking scores rather than knowing move comparison rules. It also makes the code more readable -- move1.beats(move2) is self-documenting. If the win logic were in the Game class, it would grow with every new variant. With it on the Move, each variant can define its own Move enum with its own beats() logic, and the Game class remains unchanged.'
        },
        {
          question: 'How would you extend this to support Rock-Paper-Scissors-Lizard-Spock?',
          answer: 'Replace the hardcoded beats() method with a configurable win mapping: a dictionary where each move maps to the set of moves it defeats. For example, ROCK: [SCISSORS, LIZARD], PAPER: [ROCK, SPOCK], etc. The beats() method becomes a simple lookup: return other in self.wins_against. Adding a new variant requires only defining the new Move values and their win relationships in the mapping. The Game, Player, and Round classes remain completely unchanged. This demonstrates the Open/Closed Principle -- the system is open for extension (new moves) but closed for modification (existing classes).'
        },
        {
          question: 'What are the tradeoffs of different AI strategies for the computer player?',
          answer: 'A random strategy provides uniform unpredictability but no adaptation. A frequency-based strategy tracks the human\'s move history and counters their most common move, which is effective against predictable players but vulnerable to players who vary their strategy. A Markov chain strategy predicts the next move based on transition probabilities from the last move, which catches sequential patterns. The tradeoff is between complexity and effectiveness: random is trivial to implement and unbeatable in the long run (Nash equilibrium), while adaptive strategies can exploit human biases but can also be exploited by savvy opponents. Using the Strategy Pattern, you can swap AI strategies at runtime.'
        }
      ],

      tips: [
        'Use an enum for moves with a beats() method that encapsulates the win logic cleanly -- this is the core of the design.',
        'Model the game as a best-of-N match with a wins_needed threshold (best_of // 2 + 1) for clean termination logic.',
        'Make Player abstract with HumanPlayer and ComputerPlayer subclasses -- the Game does not need to know which type it is working with.',
        'For extensibility, store win relationships in a configurable mapping rather than hardcoding them in conditional logic.',
        'Track round history (both moves and outcomes) for analysis and for pattern-based AI strategies that learn from past rounds.'
      ]
    },
    {
      id: 'notepad-system',
      isNew: true,
      title: 'Notepad System',
      subtitle: 'Text Editor',
      icon: 'document',
      color: '#ca8a04',
      difficulty: 'Medium',
      description: 'Design a notepad/text editor system with note creation, editing, search, and undo/redo support.',

      introduction: `A notepad system models a simple text editor with CRUD operations on notes, undo/redo functionality, and search capabilities. It is a popular LLD interview question because it cleanly demonstrates the Command Pattern in a practical context that everyone understands. The undo/redo feature is the centerpiece of the design discussion.

This problem tests your mastery of the Command Pattern (each edit operation is encapsulated as a reversible command object with execute() and undo() methods), the Memento Pattern (for snapshotting complex note states), the Observer Pattern (auto-save triggers when content changes), and the Iterator Pattern (browsing through the notes collection). It also tests the Single Responsibility Principle by separating the Notepad (note management), CommandHistory (undo/redo stack management), and Note (content storage) into distinct classes.

The key design challenge is implementing undo/redo using the Command Pattern. Each operation (insert text, delete text, format change) is encapsulated as a command object that stores enough information to both execute and reverse the operation. An undo stack and redo stack manage the command history: undo pops from the undo stack and pushes to redo, while redo does the reverse. Critically, executing a new command clears the redo stack since the redo history becomes invalid after a new edit.`,

      coreEntities: [
        { name: 'Notepad', description: 'Main application managing notes and command history' },
        { name: 'Note', description: 'Individual note with title, content, timestamps, and tags' },
        { name: 'Command (Abstract)', description: 'Base class for all operations with execute() and undo()' },
        { name: 'InsertCommand', description: 'Inserts text at a position in a note' },
        { name: 'DeleteCommand', description: 'Deletes text range from a note' },
        { name: 'CommandHistory', description: 'Manages undo and redo stacks' }
      ],

      designPatterns: [
        'Command Pattern: Encapsulate operations for undo/redo',
        'Memento Pattern: Snapshot note state for complex undos',
        'Observer Pattern: Auto-save when note content changes',
        'Iterator Pattern: Browse through notes collection'
      ],

      implementation: `from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional

class Note:
    def __init__(self, note_id: str, title: str):
        self.note_id = note_id
        self.title = title
        self.content = ""
        self.tags: List[str] = []
        self.created_at = datetime.now()
        self.updated_at = self.created_at

    def insert_text(self, position: int, text: str):
        self.content = self.content[:position] + text + self.content[position:]
        self.updated_at = datetime.now()

    def delete_text(self, start: int, end: int) -> str:
        deleted = self.content[start:end]
        self.content = self.content[:start] + self.content[end:]
        self.updated_at = datetime.now()
        return deleted

class Command(ABC):
    @abstractmethod
    def execute(self):
        pass

    @abstractmethod
    def undo(self):
        pass

class InsertCommand(Command):
    def __init__(self, note: Note, position: int, text: str):
        self.note = note
        self.position = position
        self.text = text

    def execute(self):
        self.note.insert_text(self.position, self.text)

    def undo(self):
        self.note.delete_text(self.position, self.position + len(self.text))

class DeleteCommand(Command):
    def __init__(self, note: Note, start: int, end: int):
        self.note = note
        self.start = start
        self.end = end
        self.deleted_text = ""

    def execute(self):
        self.deleted_text = self.note.delete_text(self.start, self.end)

    def undo(self):
        self.note.insert_text(self.start, self.deleted_text)

class CommandHistory:
    def __init__(self):
        self.undo_stack: List[Command] = []
        self.redo_stack: List[Command] = []

    def execute(self, command: Command):
        command.execute()
        self.undo_stack.append(command)
        self.redo_stack.clear()

    def undo(self) -> bool:
        if not self.undo_stack:
            return False
        command = self.undo_stack.pop()
        command.undo()
        self.redo_stack.append(command)
        return True

    def redo(self) -> bool:
        if not self.redo_stack:
            return False
        command = self.redo_stack.pop()
        command.execute()
        self.undo_stack.append(command)
        return True

class Notepad:
    def __init__(self):
        self.notes: Dict[str, Note] = {}
        self.history = CommandHistory()
        self._next_id = 1

    def create_note(self, title: str) -> Note:
        note_id = f"note_{self._next_id}"
        self._next_id += 1
        note = Note(note_id, title)
        self.notes[note_id] = note
        return note

    def insert(self, note_id: str, position: int, text: str):
        note = self.notes.get(note_id)
        if note:
            cmd = InsertCommand(note, position, text)
            self.history.execute(cmd)

    def delete(self, note_id: str, start: int, end: int):
        note = self.notes.get(note_id)
        if note:
            cmd = DeleteCommand(note, start, end)
            self.history.execute(cmd)

    def search(self, query: str) -> List[Note]:
        return [n for n in self.notes.values()
                if query.lower() in n.title.lower() or query.lower() in n.content.lower()]`,

      functionalRequirements: [
        'Create, read, update, and delete notes with titles and content',
        'Insert text at any position within a note',
        'Delete text ranges from a note',
        'Undo and redo any number of operations',
        'Search notes by title or content keywords',
        'Tag notes for organization and filtering'
      ],

      nonFunctionalRequirements: [
        'O(1) undo and redo operations (stack-based)',
        'Command objects must store enough state to fully reverse the operation',
        'New edits should clear the redo stack (standard editor behavior)',
        'Memory-efficient: avoid storing full document snapshots for each command'
      ],

      keyQuestions: [
        {
          question: 'Why use the Command Pattern instead of storing full document snapshots for undo?',
          answer: 'Full document snapshots (Memento Pattern) store the entire note content before each change. For a 10MB document with 1000 edits, this would require 10GB of undo history. The Command Pattern stores only the delta: InsertCommand stores the inserted text and position (a few bytes), DeleteCommand stores the deleted text and range. This is orders of magnitude more memory-efficient. The tradeoff is that commands must be carefully implemented to be truly reversible, and complex operations (like find-and-replace-all) may need to be decomposed into multiple commands. For simple text editors, the Command Pattern is the clear winner.'
        },
        {
          question: 'How would you extend this to support collaborative editing by multiple users?',
          answer: 'Collaborative editing requires Operational Transformation (OT) or Conflict-free Replicated Data Types (CRDTs). Each user generates commands locally and sends them to a server. The server transforms concurrent commands to resolve conflicts (e.g., two users inserting at the same position). Each command must carry a version/timestamp for ordering. The undo stack becomes per-user, and undoing your edit must not undo others\' concurrent edits. This is a significantly more complex system (Google Docs uses OT), but the Command Pattern foundation remains -- commands are just enhanced with transformation logic.'
        },
        {
          question: 'What are the tradeoffs of a global undo stack vs. per-note undo stacks?',
          answer: 'A global undo stack tracks all operations across all notes in chronological order, which matches the mental model of "undo the last thing I did regardless of which note." Per-note undo stacks are scoped, so undoing in Note A does not affect Note B. The global approach is simpler but can be confusing when switching between notes. The per-note approach requires maintaining separate CommandHistory instances for each note but provides more predictable behavior. Most text editors use per-document undo stacks, while some IDEs offer a global undo. The per-note approach is generally preferred for notepad applications.'
        }
      ],

      tips: [
        'Each Command must store enough state to reverse itself: InsertCommand stores the text and position, DeleteCommand stores the deleted text and range.',
        'Always clear the redo stack when a new command is executed -- this is standard editor behavior that prevents inconsistent redo states.',
        'Use the Command Pattern for all mutating operations, not just text edits -- rename, tag changes, and formatting should also be undoable.',
        'Implement a CommandHistory class that manages both undo and redo stacks, keeping the Notepad class focused on note management.',
        'For search, consider building an inverted index (word -> set of note IDs) for efficient full-text search as the number of notes grows.'
      ]
    },
    {
      id: '2d-vector',
      isNew: true,
      title: '2D Vector Class',
      subtitle: 'Mathematical Vector',
      icon: 'arrowUpDown',
      color: '#0369a1',
      difficulty: 'Easy',
      description: 'Design a 2D vector class supporting arithmetic operations, dot product, cross product, and transformations.',

      introduction: `A 2D vector class is a fundamental building block in game development, physics simulations, and computer graphics. It is asked in LLD interviews at gaming companies and graphics-focused teams because it tests your understanding of operator overloading, immutability, and clean mathematical API design. The design must balance mathematical correctness with OOP best practices.

This problem tests your understanding of the Immutable Object Pattern (operations return new vectors instead of mutating), operator overloading for natural mathematical syntax, the Factory Method Pattern for creating common vectors (zero, unit_x, unit_y, from_angle), and encapsulation through read-only properties. It also demonstrates value equality semantics (two vectors with the same x,y are equal regardless of identity) and floating-point comparison using epsilon tolerance.

The key design insight is making the Vector2D class immutable: every arithmetic operation returns a new Vector2D instance rather than modifying the existing one. This prevents subtle bugs from shared references (when two game objects reference the same position vector), enables safe use as dictionary keys (since immutable objects have stable hash values), and makes the class inherently thread-safe without any synchronization.`,

      coreEntities: [
        { name: 'Vector2D', description: 'Immutable 2D vector with x, y components and arithmetic operations' },
        { name: 'Magnitude', description: 'Length of the vector computed as sqrt(x^2 + y^2)' },
        { name: 'Unit Vector', description: 'Normalized vector with magnitude 1, preserving direction' }
      ],

      designPatterns: [
        'Immutable Object Pattern: Operations return new vectors instead of mutating',
        'Operator Overloading: Natural mathematical syntax (+, -, *, ==)',
        'Factory Method: Static methods for common vectors (zero, unit_x, unit_y)'
      ],

      implementation: `import math
from typing import Tuple

class Vector2D:
    def __init__(self, x: float = 0.0, y: float = 0.0):
        self._x = x
        self._y = y

    @property
    def x(self) -> float:
        return self._x

    @property
    def y(self) -> float:
        return self._y

    def __add__(self, other: 'Vector2D') -> 'Vector2D':
        return Vector2D(self.x + other.x, self.y + other.y)

    def __sub__(self, other: 'Vector2D') -> 'Vector2D':
        return Vector2D(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> 'Vector2D':
        return Vector2D(self.x * scalar, self.y * scalar)

    def __eq__(self, other) -> bool:
        if not isinstance(other, Vector2D):
            return False
        return math.isclose(self.x, other.x) and math.isclose(self.y, other.y)

    def magnitude(self) -> float:
        return math.sqrt(self.x ** 2 + self.y ** 2)

    def normalize(self) -> 'Vector2D':
        mag = self.magnitude()
        if mag == 0:
            return Vector2D(0, 0)
        return Vector2D(self.x / mag, self.y / mag)

    def dot(self, other: 'Vector2D') -> float:
        return self.x * other.x + self.y * other.y

    def cross(self, other: 'Vector2D') -> float:
        return self.x * other.y - self.y * other.x

    def angle(self) -> float:
        return math.atan2(self.y, self.x)

    def angle_between(self, other: 'Vector2D') -> float:
        cos_angle = self.dot(other) / (self.magnitude() * other.magnitude())
        cos_angle = max(-1, min(1, cos_angle))  # clamp for floating point
        return math.acos(cos_angle)

    def rotate(self, radians: float) -> 'Vector2D':
        cos_r = math.cos(radians)
        sin_r = math.sin(radians)
        return Vector2D(
            self.x * cos_r - self.y * sin_r,
            self.x * sin_r + self.y * cos_r
        )

    def distance_to(self, other: 'Vector2D') -> float:
        return (self - other).magnitude()

    @staticmethod
    def zero() -> 'Vector2D':
        return Vector2D(0, 0)

    @staticmethod
    def from_angle(radians: float, magnitude: float = 1.0) -> 'Vector2D':
        return Vector2D(math.cos(radians) * magnitude, math.sin(radians) * magnitude)

    def __repr__(self) -> str:
        return f"Vector2D({self.x:.2f}, {self.y:.2f})"`,

      functionalRequirements: [
        'Vector arithmetic: add, subtract, scalar multiply',
        'Dot product and cross product (scalar result in 2D)',
        'Magnitude (length) and normalization (unit vector)',
        'Rotation by an angle in radians',
        'Angle calculation (absolute and between two vectors)',
        'Distance between two points represented as vectors',
        'Static factory methods for common vectors (zero, from_angle)'
      ],

      nonFunctionalRequirements: [
        'Immutable: all operations return new Vector2D instances',
        'Floating-point equality using epsilon tolerance (math.isclose)',
        'Read-only properties for x and y components',
        'Natural mathematical syntax via operator overloading'
      ],

      keyQuestions: [
        {
          question: 'Why make the Vector2D class immutable instead of mutable?',
          answer: 'Immutability prevents a class of bugs where modifying a shared vector inadvertently affects multiple objects. For example, if two game entities share a position vector, mutating it through one entity would move both. Immutable vectors are also inherently thread-safe since no synchronization is needed for read-only objects. They can be safely used as dictionary keys and set elements because their hash values never change. The tradeoff is that every operation creates a new object, which can cause garbage collection pressure in tight loops. In performance-critical code (e.g., physics engines), a mutable variant or struct-based approach may be needed.'
        },
        {
          question: 'How would you extend this to support 3D vectors while reusing code?',
          answer: 'You could create a Vector3D class that adds a z component and extends the operations (cross product returns a vector in 3D rather than a scalar). However, inheritance from Vector2D is not ideal because a 3D vector is not a 2D vector (violates Liskov Substitution). Instead, define a Vector interface with common operations and implement Vector2D and Vector3D separately. Shared utility logic (magnitude formula, normalization algorithm) can be in a VectorUtils helper class. Alternatively, use a generalized VectorN class backed by an array of components, with dimension-specific subclasses for optimized 2D and 3D operations.'
        },
        {
          question: 'What are the tradeoffs of using math.isclose for equality vs. exact comparison?',
          answer: 'Floating-point arithmetic introduces rounding errors: 0.1 + 0.2 != 0.3 in IEEE 754. Exact comparison (==) would make mathematically equal vectors appear unequal, causing bugs in collision detection, geometry tests, and set/dict usage. math.isclose uses a relative and absolute tolerance to determine if two floats are "close enough," which handles most practical cases. The tradeoff is that isclose equality is not transitive (a close to b and b close to c does not guarantee a close to c), which can cause subtle issues with hash-based collections. For dictionary keys, you might need to quantize vectors to a grid resolution.'
        }
      ],

      tips: [
        'Use @property decorators to make x and y read-only, enforcing immutability at the API level.',
        'Implement __eq__ with math.isclose for floating-point tolerance, and implement __hash__ consistently (round components to a precision for stable hashing).',
        'Provide static factory methods like Vector2D.zero(), Vector2D.from_angle(theta), and Vector2D.unit_x() for common vector creation patterns.',
        'The cross product in 2D returns a scalar (the z-component of the 3D cross product), which represents the signed area of the parallelogram formed by the two vectors.',
        'Handle the zero vector edge case in normalize() -- dividing by zero magnitude should return a zero vector or raise an exception, not produce NaN.'
      ]
    },
    {
      id: 'access-management',
      isNew: true,
      title: 'Access Management System',
      subtitle: 'Role-Based Access Control',
      icon: 'shield',
      color: '#7e22ce',
      difficulty: 'Medium',
      description: 'Design a role-based access control (RBAC) system managing users, roles, and permissions.',

      introduction: `An access management system controls who can access what resources in an application. RBAC (Role-Based Access Control) is the industry standard approach, used by AWS IAM, Kubernetes RBAC, and most enterprise software. It is a frequently asked LLD question because it involves hierarchical data structures, permission resolution algorithms, and real-world security concerns.

This problem tests your understanding of the Composite Pattern for role hierarchies (roles can inherit from parent roles), the Chain of Responsibility Pattern for permission checks cascading through the role hierarchy, the Singleton Pattern for the central AccessManager, and the Observer Pattern for propagating permission changes. It also tests the Liskov Substitution Principle since all roles, regardless of their position in the hierarchy, should behave consistently through the Role interface.

The key design decisions involve permission inheritance through role hierarchies (an Editor role inherits all Viewer permissions), handling resource-level permissions (READ access on document A does not grant READ on document B), and efficiently checking access for deeply nested permission structures. The resolution algorithm walks up the role hierarchy collecting permissions until the required permission is found or the hierarchy is exhausted.`,

      coreEntities: [
        { name: 'User', description: 'System user with assigned roles' },
        { name: 'Role', description: 'Named collection of permissions (e.g., Admin, Editor, Viewer)' },
        { name: 'Permission', description: 'Specific action on a resource (e.g., READ:document)' },
        { name: 'Resource', description: 'Protected entity (document, API endpoint, feature)' },
        { name: 'AccessManager', description: 'Central authority for permission checks and role management' }
      ],

      designPatterns: [
        'Composite Pattern: Role hierarchies with inherited permissions',
        'Chain of Responsibility: Permission checks cascade through role hierarchy',
        'Singleton Pattern: Single AccessManager instance',
        'Observer Pattern: Notify dependent services when permissions change'
      ],

      implementation: `from typing import Dict, Set, List, Optional
from enum import Enum
from threading import Lock

class Action(Enum):
    READ = 'read'
    WRITE = 'write'
    DELETE = 'delete'
    ADMIN = 'admin'

class Permission:
    def __init__(self, resource: str, action: Action):
        self.resource = resource
        self.action = action

    def __hash__(self):
        return hash((self.resource, self.action))

    def __eq__(self, other):
        return self.resource == other.resource and self.action == other.action

class Role:
    def __init__(self, name: str):
        self.name = name
        self.permissions: Set[Permission] = set()
        self.parent_roles: List['Role'] = []  # role hierarchy

    def add_permission(self, permission: Permission):
        self.permissions.add(permission)

    def add_parent(self, parent: 'Role'):
        self.parent_roles.append(parent)

    def get_all_permissions(self) -> Set[Permission]:
        """Get permissions including inherited from parent roles."""
        all_perms = set(self.permissions)
        for parent in self.parent_roles:
            all_perms.update(parent.get_all_permissions())
        return all_perms

class User:
    def __init__(self, user_id: str, name: str):
        self.user_id = user_id
        self.name = name
        self.roles: List[Role] = []

    def get_all_permissions(self) -> Set[Permission]:
        perms = set()
        for role in self.roles:
            perms.update(role.get_all_permissions())
        return perms

class AccessManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.users: Dict[str, User] = {}
        self.roles: Dict[str, Role] = {}
        self.lock = Lock()

    def create_role(self, name: str, parent_name: str = None) -> Role:
        with self.lock:
            role = Role(name)
            if parent_name and parent_name in self.roles:
                role.add_parent(self.roles[parent_name])
            self.roles[name] = role
            return role

    def assign_role(self, user_id: str, role_name: str) -> bool:
        user = self.users.get(user_id)
        role = self.roles.get(role_name)
        if not user or not role:
            return False
        if role not in user.roles:
            user.roles.append(role)
        return True

    def check_access(self, user_id: str, resource: str, action: Action) -> bool:
        user = self.users.get(user_id)
        if not user:
            return False
        required = Permission(resource, action)
        return required in user.get_all_permissions()`,

      functionalRequirements: [
        'Create roles with optional parent roles for hierarchical inheritance',
        'Assign permissions (resource + action pairs) to roles',
        'Assign one or more roles to users',
        'Check if a user has a specific permission on a resource',
        'Support permission inheritance: child roles inherit all parent permissions',
        'Revoke roles and permissions dynamically'
      ],

      nonFunctionalRequirements: [
        'Thread-safe role and permission modifications',
        'Efficient permission resolution for deeply nested hierarchies',
        'Prevent circular role inheritance',
        'Support audit logging of access checks and permission changes'
      ],

      keyQuestions: [
        {
          question: 'Why use the Composite Pattern for role hierarchies instead of flat role assignment?',
          answer: 'The Composite Pattern allows roles to inherit permissions from parent roles, dramatically reducing configuration overhead. Instead of assigning 50 individual permissions to an Admin role, you can have Admin inherit from Editor (which inherits from Viewer), and only add the admin-specific permissions. This mirrors real organizational structures: a Manager has all Employee permissions plus additional ones. The get_all_permissions() method recursively collects permissions up the hierarchy. Without this, every role would need explicit assignment of every permission, leading to duplication and maintenance nightmares. The tradeoff is complexity in the resolution algorithm and the risk of circular inheritance, which must be detected during role creation.'
        },
        {
          question: 'How would you extend this to support deny rules (explicit permission denial)?',
          answer: 'Add a PermissionEffect enum with ALLOW and DENY values. Each ACL entry would specify both the permission and the effect. During resolution, deny rules take precedence over allow rules (deny-overrides model). Walk through all of the user\'s roles and their ancestors, collecting both allows and denies. If any deny matches the requested permission, access is denied regardless of allows. This is how AWS IAM works. The tradeoff is increased complexity: you need clear precedence rules (explicit deny > explicit allow > implicit deny) and the resolution algorithm must check all roles rather than short-circuiting at the first allow.'
        },
        {
          question: 'What are the tradeoffs of eager permission resolution vs. lazy resolution?',
          answer: 'Eager resolution pre-computes the effective permission set for each user when roles or permissions change, storing the flattened set. Access checks are then O(1) lookups. Lazy resolution computes permissions on each access check by traversing the role hierarchy. Eager is faster for checks but slower for updates (any role change requires recomputing for all affected users). Lazy is faster for updates but slower for checks. In most systems, access checks vastly outnumber permission changes, so eager resolution with cached permission sets is preferred. The cache is invalidated when roles or permissions change, and rebuild is amortized.'
        }
      ],

      tips: [
        'Model Permission as a (resource, action) pair with proper __hash__ and __eq__ for set operations.',
        'Detect circular role inheritance during role creation by checking if the new parent is a descendant of the role being created.',
        'Cache the resolved permission set per user and invalidate the cache when any of the user\'s roles or their ancestors change.',
        'Use a global lock for role/permission modifications but allow concurrent read access for permission checks (read-write lock pattern).',
        'Consider wildcards for resources (e.g., READ:documents:* grants read on all documents) to reduce the number of individual permission entries.'
      ]
    },
    {
      id: 'gpu-credits',
      isNew: true,
      title: 'Design GPU Credits',
      subtitle: 'Cloud GPU Billing',
      icon: 'zap',
      color: '#e11d48',
      difficulty: 'Medium',
      description: 'Design a GPU credits system for cloud computing with usage tracking, billing, and quota management.',

      introduction: `A GPU credits system manages the allocation and billing of GPU compute resources in a cloud platform, similar to systems at AWS, Google Cloud, and Lambda Labs. It is a modern LLD question that tests your ability to design financial systems with concurrent resource tracking. Users purchase credits and spend them based on GPU type, duration, and priority.

This problem tests your understanding of the Observer Pattern (notify users when credit balance is low), the Strategy Pattern for different pricing models (on-demand, reserved, spot pricing), the Scheduler Pattern for periodic billing of running instances, and the Double-Entry Ledger pattern where every credit movement has balanced debit and credit entries for auditability. It also tests thread safety for concurrent credit deductions and the atomicity of financial operations.

The key challenges are: atomic credit deductions during concurrent GPU usage (multiple instances billing simultaneously against the same account), handling preemptible vs dedicated instances with different pricing tiers, rate calculations that vary by GPU type (T4, A100, H100), and graceful handling of credit exhaustion mid-job where the system must terminate the instance without losing the user's work if possible. The ledger-based approach ensures complete auditability of all credit movements.`,

      coreEntities: [
        { name: 'Account', description: 'User account with credit balance and usage history' },
        { name: 'CreditLedger', description: 'Double-entry ledger tracking all credit transactions' },
        { name: 'GPUInstance', description: 'Running GPU instance consuming credits over time' },
        { name: 'PricingTier', description: 'Rate card for different GPU types (T4, A100, H100)' },
        { name: 'UsageTracker', description: 'Monitors running instances and deducts credits periodically' },
        { name: 'QuotaManager', description: 'Enforces spending limits and instance quotas' }
      ],

      designPatterns: [
        'Observer Pattern: Notify user when credit balance is low',
        'Strategy Pattern: Different pricing strategies (on-demand, reserved, spot)',
        'Scheduler Pattern: Periodic credit deduction for running instances',
        'Double-Entry Ledger: Every credit movement has balanced debit/credit'
      ],

      implementation: `from enum import Enum
from datetime import datetime
from typing import Dict, List, Optional
from threading import Lock
from dataclasses import dataclass

class GPUType(Enum):
    T4 = ('t4', 0.5)       # $0.50/credit per hour
    A100 = ('a100', 2.0)    # $2.00/credit per hour
    H100 = ('h100', 4.0)    # $4.00/credit per hour

    def __init__(self, gpu_name: str, rate: float):
        self.gpu_name = gpu_name
        self.rate = rate

class InstanceStatus(Enum):
    RUNNING = 'running'
    STOPPED = 'stopped'
    TERMINATED = 'terminated'

@dataclass
class LedgerEntry:
    account_id: str
    amount: float  # positive = credit, negative = debit
    description: str
    timestamp: datetime
    balance_after: float

class Account:
    def __init__(self, account_id: str):
        self.account_id = account_id
        self.balance = 0.0
        self.lock = Lock()
        self.ledger: List[LedgerEntry] = []

    def add_credits(self, amount: float, description: str = "Credit purchase"):
        with self.lock:
            self.balance += amount
            self.ledger.append(LedgerEntry(
                self.account_id, amount, description, datetime.now(), self.balance))

    def deduct_credits(self, amount: float, description: str = "Usage") -> bool:
        with self.lock:
            if self.balance < amount:
                return False
            self.balance -= amount
            self.ledger.append(LedgerEntry(
                self.account_id, -amount, description, datetime.now(), self.balance))
            return True

class GPUInstance:
    def __init__(self, instance_id: str, account: Account, gpu_type: GPUType):
        self.instance_id = instance_id
        self.account = account
        self.gpu_type = gpu_type
        self.status = InstanceStatus.RUNNING
        self.started_at = datetime.now()
        self.last_billed_at = self.started_at

class GPUCreditsSystem:
    def __init__(self):
        self.accounts: Dict[str, Account] = {}
        self.instances: Dict[str, GPUInstance] = {}
        self.lock = Lock()

    def launch_instance(self, account_id: str, gpu_type: GPUType) -> Optional[GPUInstance]:
        account = self.accounts.get(account_id)
        if not account or account.balance < gpu_type.rate:
            return None  # Insufficient credits
        instance = GPUInstance(f"gpu_{len(self.instances)}", account, gpu_type)
        self.instances[instance.instance_id] = instance
        return instance

    def bill_usage(self):
        """Called periodically (e.g., every minute) to deduct credits."""
        now = datetime.now()
        for instance in list(self.instances.values()):
            if instance.status != InstanceStatus.RUNNING:
                continue
            hours = (now - instance.last_billed_at).total_seconds() / 3600
            cost = hours * instance.gpu_type.rate
            if not instance.account.deduct_credits(cost, f"GPU {instance.gpu_type.gpu_name}"):
                instance.status = InstanceStatus.TERMINATED
            else:
                instance.last_billed_at = now`,

      functionalRequirements: [
        'Purchase and add credits to user accounts',
        'Launch GPU instances that consume credits over time',
        'Periodic billing deducts credits based on GPU type and duration',
        'Terminate instances automatically when credits are exhausted',
        'Track all credit movements in an immutable ledger',
        'Support different GPU types with different hourly rates'
      ],

      nonFunctionalRequirements: [
        'Thread-safe credit deductions for concurrent billing',
        'Atomic balance checks and deductions to prevent overspending',
        'Double-entry ledger for auditability and reconciliation',
        'Real-time balance visibility despite concurrent operations'
      ],

      keyQuestions: [
        {
          question: 'Why use a double-entry ledger instead of a simple balance counter?',
          answer: 'A simple balance counter (balance += amount, balance -= amount) provides no audit trail. If a bug causes an incorrect deduction, there is no way to trace what happened. A double-entry ledger records every credit movement as an immutable LedgerEntry with amount, description, timestamp, and resulting balance. This enables full audit trail reconstruction, dispute resolution, and reconciliation. You can replay the entire ledger to verify the current balance matches the sum of all entries. The tradeoff is more storage and slightly slower writes (append to ledger + update balance), but this is essential for any financial system.'
        },
        {
          question: 'How would you extend this to support reserved instances with upfront payment?',
          answer: 'Add a ReservedInstance class that requires upfront credit payment for a fixed duration (e.g., 100 credits for 1 month of A100 access). The account is charged immediately, and the instance runs at a reduced hourly rate (or zero rate if fully prepaid). A ReservationManager tracks active reservations and their expiry dates. When a reserved instance is launched, billing checks the reservation first. If the reservation has expired or the instance exceeds the reservation, it falls back to on-demand rates. This uses the Strategy Pattern for pricing: OnDemandPricing, ReservedPricing, and SpotPricing each calculate costs differently.'
        },
        {
          question: 'What are the tradeoffs of billing at fixed intervals vs. event-driven billing?',
          answer: 'Fixed-interval billing (e.g., every minute) is simple to implement with a periodic scheduler but creates a delay between resource usage and credit deduction. A user could launch many instances, consume resources for up to one billing interval, and have their credits go negative before the next billing cycle. Event-driven billing charges immediately at instance launch (minimum charge) and on shutdown (final settlement), but still needs periodic billing for long-running instances. The best approach combines both: event-driven for launch/shutdown and periodic for continuous usage, with a pre-authorization check at launch time to ensure minimum credits are available.'
        }
      ],

      tips: [
        'Always check credit balance before launching an instance -- require at least one billing period worth of credits as a pre-authorization.',
        'Use locks at the account level for credit deductions to prevent concurrent billing from overdrawing the account.',
        'The LedgerEntry should be immutable -- never modify a ledger entry, only append new ones. This is fundamental to financial system design.',
        'Implement a low-balance notification threshold (e.g., 10% remaining) using the Observer Pattern to warn users before their instances are terminated.',
        'Consider grace periods for credit exhaustion: rather than immediate termination, give the user a warning and a few minutes to add credits or save their work.'
      ]
    },
    {
      id: 'disk-space-manager',
      isNew: true,
      title: 'Disk Space Manager',
      subtitle: 'Storage Block Allocator',
      icon: 'hardDrive',
      color: '#475569',
      difficulty: 'Medium',
      description: 'Design a disk space manager that allocates and frees blocks of storage with defragmentation support.',

      introduction: `A disk space manager handles the allocation and deallocation of storage blocks on a disk. It is a systems-oriented LLD question that tests your understanding of how file systems manage storage at the block level. Similar to a memory allocator, but operating on fixed-size blocks, this problem is relevant to anyone working on file systems, databases, or storage engines.

This problem tests your understanding of the Bitmap Pattern for efficient block status tracking, the Strategy Pattern for different allocation policies (first-fit for scattered allocation, contiguous for sequential access), and the Facade Pattern where the DiskManager hides the complexity of bitmap management and defragmentation behind a simple allocate/free API. It also tests your knowledge of fragmentation concepts and the tradeoffs between scattered and contiguous allocation.

The key challenges are: minimizing fragmentation through smart allocation policies, efficiently finding contiguous free blocks for large files that benefit from sequential reads, and implementing defragmentation to compact allocated blocks when fragmentation becomes excessive. The bitmap data structure provides O(1) status lookup for any block and O(n) scanning for allocation, while the fragmentation ratio metric helps decide when defragmentation is needed.`,

      coreEntities: [
        { name: 'DiskManager', description: 'Central manager tracking block allocation across the disk' },
        { name: 'Block', description: 'Fixed-size storage unit (e.g., 4KB) with allocation status' },
        { name: 'FileEntry', description: 'Metadata mapping a file to its allocated blocks' },
        { name: 'FreeBlockBitmap', description: 'Bitmap tracking free/used status of every block' },
        { name: 'AllocationPolicy', description: 'Strategy for choosing blocks (contiguous, scattered)' }
      ],

      designPatterns: [
        'Bitmap Pattern: Bit array for O(1) block status lookup',
        'Strategy Pattern: Different allocation policies (first-fit, contiguous)',
        'Facade Pattern: DiskManager hides complexity of block management'
      ],

      implementation: `from typing import Dict, List, Optional

class DiskManager:
    def __init__(self, total_blocks: int):
        self.total_blocks = total_blocks
        self.bitmap = [False] * total_blocks  # False = free, True = allocated
        self.files: Dict[str, List[int]] = {}  # filename -> list of block indices
        self.free_count = total_blocks

    def allocate(self, filename: str, num_blocks: int) -> bool:
        """Allocate blocks for a file using first-fit strategy."""
        if num_blocks > self.free_count:
            return False

        allocated = []
        for i in range(self.total_blocks):
            if not self.bitmap[i]:
                allocated.append(i)
                if len(allocated) == num_blocks:
                    break

        if len(allocated) < num_blocks:
            return False

        for block_idx in allocated:
            self.bitmap[block_idx] = True

        self.files[filename] = allocated
        self.free_count -= num_blocks
        return True

    def allocate_contiguous(self, filename: str, num_blocks: int) -> bool:
        """Allocate contiguous blocks for a file."""
        start = self._find_contiguous(num_blocks)
        if start == -1:
            return False

        blocks = list(range(start, start + num_blocks))
        for idx in blocks:
            self.bitmap[idx] = True

        self.files[filename] = blocks
        self.free_count -= num_blocks
        return True

    def _find_contiguous(self, num_blocks: int) -> int:
        """Find first contiguous run of free blocks."""
        count = 0
        start = -1
        for i in range(self.total_blocks):
            if not self.bitmap[i]:
                if count == 0:
                    start = i
                count += 1
                if count == num_blocks:
                    return start
            else:
                count = 0
                start = -1
        return -1

    def free(self, filename: str) -> bool:
        if filename not in self.files:
            return False
        blocks = self.files.pop(filename)
        for idx in blocks:
            self.bitmap[idx] = False
        self.free_count += len(blocks)
        return True

    def defragment(self):
        """Move all allocated blocks to the front of the disk."""
        write_pos = 0
        new_files: Dict[str, List[int]] = {f: [] for f in self.files}

        # Collect all allocated blocks in file order
        for filename, blocks in self.files.items():
            for _ in blocks:
                while self.bitmap[write_pos] and write_pos not in blocks:
                    write_pos += 1
                new_files[filename].append(write_pos)
                write_pos += 1

        # Reset and reallocate
        self.bitmap = [False] * self.total_blocks
        for filename, blocks in new_files.items():
            for idx in blocks:
                self.bitmap[idx] = True
        self.files = new_files

    def get_fragmentation_ratio(self) -> float:
        """Return ratio of fragmented files (non-contiguous blocks)."""
        if not self.files:
            return 0.0
        fragmented = 0
        for blocks in self.files.values():
            if len(blocks) > 1:
                for i in range(1, len(blocks)):
                    if blocks[i] != blocks[i-1] + 1:
                        fragmented += 1
                        break
        return fragmented / len(self.files)`,

      functionalRequirements: [
        'Allocate blocks for files using scattered or contiguous strategies',
        'Free blocks when files are deleted',
        'Track which blocks belong to which files',
        'Defragment the disk by compacting allocated blocks to the front',
        'Report fragmentation ratio to determine when defragmentation is needed',
        'Support both first-fit scattered and contiguous block allocation'
      ],

      nonFunctionalRequirements: [
        'O(1) block status lookup using bitmap',
        'O(n) allocation time for first-fit scanning',
        'Defragmentation should preserve file integrity (all blocks remain associated with correct files)',
        'Thread-safe allocation for concurrent file operations'
      ],

      keyQuestions: [
        {
          question: 'Why use a bitmap instead of a free list for tracking block status?',
          answer: 'A bitmap provides O(1) status check for any specific block (bitmap[i]) and compact representation (1 bit per block, so 1GB of 4KB blocks needs only 32KB for the bitmap). A free list provides O(1) allocation (pop from list) but O(n) for checking if a specific block is free. The bitmap is better for finding contiguous free regions (scan consecutive bits) and for defragmentation analysis. The tradeoff is that allocation requires scanning the bitmap to find free blocks (O(n)), while a free list pops in O(1). Real file systems often combine both: a bitmap for global status and a free list/tree for efficient allocation.'
        },
        {
          question: 'How would you extend this to support file system metadata (directories, inodes)?',
          answer: 'Add an Inode class that stores file metadata (name, size, timestamps, permission, block list) similar to Unix inodes. A Directory class contains a mapping of names to inode numbers. The DiskManager would reserve some blocks for the inode table (fixed area at the beginning of the disk). File creation allocates an inode, then allocates data blocks. The directory tree is itself stored in blocks, with the root directory at a known inode number. This introduces the concept of metadata blocks vs. data blocks and requires careful management of the inode table capacity.'
        },
        {
          question: 'What are the tradeoffs of contiguous vs. scattered block allocation?',
          answer: 'Contiguous allocation places all blocks of a file sequentially on disk, providing excellent sequential read performance (no disk head seeking) and simple block lookup (start + offset). However, it suffers from external fragmentation (large contiguous regions become scarce over time) and makes file growth difficult (cannot extend if the next blocks are occupied). Scattered allocation uses any available blocks, eliminating external fragmentation and allowing easy file growth, but sequential reads require seeking between non-adjacent blocks. Modern file systems use extent-based allocation: allocate contiguous extents where possible, falling back to scattered allocation when necessary.'
        }
      ],

      tips: [
        'Use a boolean array (or bit array for production) for the bitmap -- False means free, True means allocated.',
        'Track a free_count to quickly answer "is there enough space?" without scanning the entire bitmap.',
        'The defragment operation must update the files mapping atomically -- use a new_files dict built during compaction and swap it at the end.',
        'Implement a fragmentation_ratio metric to help decide when defragmentation is worth the I/O cost.',
        'For contiguous allocation, use a sliding window approach to find the first contiguous run of free blocks of sufficient length.'
      ]
    },
    {
      id: 'account-balance-tracker',
      isNew: true,
      title: 'Account Balance Tracker',
      subtitle: 'Financial Ledger',
      icon: 'dollarSign',
      color: '#047857',
      difficulty: 'Easy',
      description: 'Design an account balance tracker with deposits, withdrawals, transfers, and transaction history.',

      introduction: `An account balance tracker maintains financial account balances with thread-safe deposit, withdrawal, and transfer operations. It is a practical LLD question that directly tests your understanding of concurrent programming concepts that are critical in banking, fintech, and payment processing systems. Even simple-looking financial operations become complex when concurrency is involved.

This problem tests your understanding of thread safety using locks, atomic operations for multi-account transfers, deadlock prevention through lock ordering, and immutable transaction records for auditability. It also demonstrates the importance of the invariant that total money in the system must be conserved across all operations -- deposits increase total, withdrawals decrease total, and transfers preserve total.

The key challenge is ensuring that transfers between accounts are atomic -- either both the debit and credit succeed, or neither does. This prevents money from being lost or created due to partial failures. Additionally, when two concurrent transfers involve overlapping accounts (A->B and B->A), a naive locking strategy causes deadlock. The solution is lock ordering: always acquire locks in a deterministic order (e.g., by account ID) regardless of the transfer direction.`,

      coreEntities: [
        { name: 'Account', description: 'Individual account with balance and transaction history' },
        { name: 'Transaction', description: 'Record of a deposit, withdrawal, or transfer' },
        { name: 'BalanceTracker', description: 'Manages multiple accounts and cross-account transfers' },
        { name: 'TransactionType (Enum)', description: 'DEPOSIT, WITHDRAWAL, TRANSFER' }
      ],

      designPatterns: [
        'Thread Safety: Lock-based protection for balance modifications',
        'Atomic Transfer: Lock ordering to prevent deadlocks during transfers',
        'Immutable Transaction: Transaction records cannot be modified after creation'
      ],

      implementation: `from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from threading import Lock

class TransactionType(Enum):
    DEPOSIT = 'deposit'
    WITHDRAWAL = 'withdrawal'
    TRANSFER = 'transfer'

class Transaction:
    def __init__(self, tx_type: TransactionType, amount: float,
                 from_account: str = None, to_account: str = None):
        self.tx_type = tx_type
        self.amount = amount
        self.from_account = from_account
        self.to_account = to_account
        self.timestamp = datetime.now()

class Account:
    def __init__(self, account_id: str, initial_balance: float = 0.0):
        self.account_id = account_id
        self.balance = initial_balance
        self.transactions: List[Transaction] = []
        self.lock = Lock()

    def deposit(self, amount: float) -> bool:
        if amount <= 0:
            return False
        with self.lock:
            self.balance += amount
            self.transactions.append(
                Transaction(TransactionType.DEPOSIT, amount, to_account=self.account_id))
            return True

    def withdraw(self, amount: float) -> bool:
        if amount <= 0:
            return False
        with self.lock:
            if self.balance < amount:
                return False
            self.balance -= amount
            self.transactions.append(
                Transaction(TransactionType.WITHDRAWAL, amount, from_account=self.account_id))
            return True

    def get_balance(self) -> float:
        return self.balance

class BalanceTracker:
    def __init__(self):
        self.accounts: Dict[str, Account] = {}

    def create_account(self, account_id: str, initial_balance: float = 0.0) -> Account:
        account = Account(account_id, initial_balance)
        self.accounts[account_id] = account
        return account

    def transfer(self, from_id: str, to_id: str, amount: float) -> bool:
        from_acc = self.accounts.get(from_id)
        to_acc = self.accounts.get(to_id)
        if not from_acc or not to_acc or amount <= 0:
            return False

        # Lock ordering by account_id to prevent deadlocks
        first, second = sorted([from_acc, to_acc], key=lambda a: a.account_id)
        with first.lock:
            with second.lock:
                if from_acc.balance < amount:
                    return False
                from_acc.balance -= amount
                to_acc.balance += amount
                tx = Transaction(TransactionType.TRANSFER, amount, from_id, to_id)
                from_acc.transactions.append(tx)
                to_acc.transactions.append(tx)
                return True

    def get_total_balance(self) -> float:
        return sum(acc.balance for acc in self.accounts.values())`,

      functionalRequirements: [
        'Create accounts with optional initial balances',
        'Deposit funds into an account',
        'Withdraw funds with insufficient balance checks',
        'Transfer funds atomically between two accounts',
        'Record immutable transaction history for each account',
        'Query current balance and total system balance'
      ],

      nonFunctionalRequirements: [
        'Thread-safe deposits and withdrawals using per-account locks',
        'Deadlock-free transfers using lock ordering by account ID',
        'Atomic transfers: both debit and credit succeed or neither does',
        'Immutable transaction records for audit trail'
      ],

      keyQuestions: [
        {
          question: 'Why is lock ordering necessary to prevent deadlocks during transfers?',
          answer: 'Consider two concurrent transfers: Thread 1 transfers A->B (locks A, then B) and Thread 2 transfers B->A (locks B, then A). Thread 1 holds A\'s lock and waits for B, while Thread 2 holds B\'s lock and waits for A -- classic deadlock. Lock ordering solves this by always acquiring locks in the same deterministic order (e.g., alphabetically by account_id). Both threads would lock A first, then B, meaning one thread proceeds while the other waits. This eliminates circular wait, one of the four necessary conditions for deadlock. The tradeoff is slightly more complex code, but it is a well-established pattern used in all banking systems.'
        },
        {
          question: 'How would you extend this to support multi-account transactions (e.g., split payments)?',
          answer: 'Create a MultiTransfer class that takes a list of (account_id, amount) pairs where amounts sum to zero (debits balance credits). Lock all involved accounts in sorted order to prevent deadlocks. Validate that all debiting accounts have sufficient funds before executing any changes. Execute all changes within the lock scope: debit all sources, credit all destinations. If any validation fails, release all locks without making changes. This generalized approach handles any number of accounts in a single atomic transaction, which is essential for batch processing and split payments.'
        },
        {
          question: 'What are the tradeoffs of per-account locks vs. a global lock for the tracker?',
          answer: 'A global lock serializes all operations across all accounts, which is simple but severely limits throughput -- depositing into Account A blocks withdrawing from Account B. Per-account locks allow parallel operations on different accounts, dramatically improving throughput. The tradeoff is increased complexity for multi-account operations (transfers need two locks with ordering). Per-account locks also use more memory (one lock per account). For a system with thousands of accounts and high transaction volume, per-account locks are essential. A global lock is only acceptable for very small systems or prototypes.'
        }
      ],

      tips: [
        'Always validate amounts are positive before processing -- negative deposits or withdrawals should be rejected.',
        'Use lock ordering (sort accounts by ID) for transfers to prevent deadlocks between concurrent transfers involving the same accounts.',
        'Make Transaction objects immutable after creation -- they serve as an audit trail and should never be modified.',
        'The get_total_balance() method should sum all account balances and can serve as a system integrity check (total should only change from external deposits/withdrawals, not transfers).',
        'Consider adding a minimum balance requirement per account and overdraft protection as extensions to discuss with the interviewer.'
      ]
    },
    {
      id: 'go-fish',
      isNew: true,
      title: 'Go Fish',
      subtitle: 'Card Game',
      icon: 'gamepad',
      color: '#1d4ed8',
      difficulty: 'Medium',
      description: 'Design the Go Fish card game with deck management, hand tracking, and book collection.',

      introduction: `Go Fish is a classic card game where players collect sets of four matching cards (books) by asking opponents for specific ranks. It is an excellent LLD interview question for demonstrating clean entity modeling, turn-based game logic, and proper validation. The design involves deck management, hand tracking, turn logic, book detection, and win condition determination.

This problem tests your understanding of the Factory Pattern for deck creation, the Iterator Pattern for traversing cards in a hand, the Template Method for the turn sequence (ask, give or fish, check for books, determine next player), and proper use of enums for type-safe Rank and Suit representation. It also tests encapsulation: the Player class hides its hand management (giving cards, receiving cards, checking for books) behind a clean interface.

The key OOP insight is separating the Deck (card source), Player (hand and book management), and Game (turn orchestration and rule enforcement) into distinct classes. The Game class should not know how the Player manages its hand internally; it only calls player.has_rank(), player.give_cards(), and player.receive_cards(). This clean separation makes the code testable and extensible to variants like Old Maid or Quartets.`,

      coreEntities: [
        { name: 'Card', description: 'Playing card with rank and suit' },
        { name: 'Deck', description: 'Standard 52-card deck with shuffle and draw' },
        { name: 'Hand', description: 'Player hand with cards grouped by rank' },
        { name: 'Player', description: 'Game participant with hand and collected books' },
        { name: 'Game', description: 'Orchestrates turns, validates asks, and detects winner' }
      ],

      designPatterns: [
        'Factory Pattern: Deck creates standard 52-card set',
        'Iterator Pattern: Traverse cards in hand',
        'Template Method: Turn sequence (ask, give/fish, check books)'
      ],

      implementation: `from enum import Enum
from random import shuffle
from typing import List, Optional
from collections import defaultdict

class Suit(Enum):
    HEARTS = 'Hearts'
    DIAMONDS = 'Diamonds'
    CLUBS = 'Clubs'
    SPADES = 'Spades'

class Rank(Enum):
    TWO = '2'; THREE = '3'; FOUR = '4'; FIVE = '5'
    SIX = '6'; SEVEN = '7'; EIGHT = '8'; NINE = '9'
    TEN = '10'; JACK = 'J'; QUEEN = 'Q'; KING = 'K'; ACE = 'A'

class Card:
    def __init__(self, rank: Rank, suit: Suit):
        self.rank = rank
        self.suit = suit

    def __repr__(self):
        return f"{self.rank.value}{self.suit.value[0]}"

class Deck:
    def __init__(self):
        self.cards = [Card(r, s) for r in Rank for s in Suit]
        shuffle(self.cards)

    def draw(self) -> Optional[Card]:
        return self.cards.pop() if self.cards else None

    def is_empty(self) -> bool:
        return len(self.cards) == 0

class Player:
    def __init__(self, name: str):
        self.name = name
        self.hand: List[Card] = []
        self.books: List[Rank] = []

    def has_rank(self, rank: Rank) -> bool:
        return any(c.rank == rank for c in self.hand)

    def give_cards(self, rank: Rank) -> List[Card]:
        given = [c for c in self.hand if c.rank == rank]
        self.hand = [c for c in self.hand if c.rank != rank]
        return given

    def receive_cards(self, cards: List[Card]):
        self.hand.extend(cards)
        self._check_books()

    def _check_books(self):
        counts = defaultdict(list)
        for card in self.hand:
            counts[card.rank].append(card)
        for rank, cards in counts.items():
            if len(cards) == 4:
                self.books.append(rank)
                self.hand = [c for c in self.hand if c.rank != rank]

    def hand_size(self) -> int:
        return len(self.hand)

class GoFishGame:
    def __init__(self, player_names: List[str]):
        self.deck = Deck()
        self.players = [Player(name) for name in player_names]
        self.current_player_idx = 0
        cards_per_player = 7 if len(player_names) <= 3 else 5
        for player in self.players:
            for _ in range(cards_per_player):
                card = self.deck.draw()
                if card:
                    player.receive_cards([card])

    def ask(self, asking_rank: Rank, target_idx: int) -> str:
        asker = self.players[self.current_player_idx]
        target = self.players[target_idx]

        if not asker.has_rank(asking_rank):
            return f"{asker.name} must hold the rank they ask for!"

        if target.has_rank(asking_rank):
            cards = target.give_cards(asking_rank)
            asker.receive_cards(cards)
            return f"{target.name} gave {len(cards)} {asking_rank.value}(s) to {asker.name}"
        else:
            # Go Fish
            card = self.deck.draw()
            if card:
                asker.receive_cards([card])
                got_asked = card.rank == asking_rank
                self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
                return f"Go Fish! {asker.name} drew a card" + (" and got what they asked for!" if got_asked else "")
            self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
            return "Go Fish! Deck is empty"

    def is_over(self) -> bool:
        return self.deck.is_empty() and all(p.hand_size() == 0 for p in self.players)

    def get_winner(self) -> Optional[Player]:
        if not self.is_over():
            return None
        return max(self.players, key=lambda p: len(p.books))`,

      functionalRequirements: [
        'Deal cards to players (7 cards for 2-3 players, 5 cards for 4+ players)',
        'Current player asks a target player for a specific rank',
        'Validate that the asking player holds at least one card of the requested rank',
        'Transfer matching cards from target to asker if target has them',
        'Draw from deck (Go Fish) if target does not have the requested rank',
        'Automatically detect and collect books (four cards of the same rank)',
        'Determine game end and winner (most books when all cards are gone)'
      ],

      nonFunctionalRequirements: [
        'Clean separation between deck, player, and game logic',
        'Type-safe representation of cards using Rank and Suit enums',
        'Proper turn management with extra turns on successful asks',
        'Support 2-6 players with configurable initial hand size'
      ],

      keyQuestions: [
        {
          question: 'Why group cards by rank in the Player hand instead of using a flat list?',
          answer: 'Grouping cards by rank (using a defaultdict of lists) provides O(1) lookup for has_rank() and give_cards() operations, which are called every turn. A flat list would require O(n) scanning to find cards of a specific rank and O(n) filtering to give them away. Grouping also makes book detection efficient: when a rank group reaches 4 cards, it is automatically a book. The tradeoff is slightly more complex insertion logic (append to the correct rank group), but this is O(1). In the implementation shown, the flat list is used for simplicity, but grouping by rank is the optimization an interviewer would expect you to discuss.'
        },
        {
          question: 'How would you extend this to support AI players with strategic asking?',
          answer: 'Create a PlayerStrategy interface with methods like chooseTarget() and chooseRank(). A RandomStrategy picks randomly, a MemoryStrategy tracks which ranks other players have asked for (revealing information about their hand), and a CountingStrategy tracks which cards have been seen to infer what opponents hold. The Game class calls player.strategy.chooseTarget() and player.strategy.chooseRank() to determine the ask. The Strategy Pattern keeps the game logic unchanged while supporting different AI difficulty levels. Memory-based strategy is the most realistic: if Player A asked for Kings last turn, they probably have some Kings.'
        },
        {
          question: 'What are the tradeoffs of checking for books after every receive vs. batching?',
          answer: 'Checking for books after every receive_cards() call ensures books are detected immediately, which is correct game behavior (you should lay down a book as soon as you have four of a rank). Batching book checks (e.g., at the end of a turn) could miss books formed mid-turn and lead to an incorrect hand state. The tradeoff is that immediate checking adds a scan of the hand after every card reception, but since hands are small (typically 5-15 cards), this is negligible. The immediate approach also simplifies the game logic: after receive_cards, the hand is always in a valid state with no complete books remaining.'
        }
      ],

      tips: [
        'The Deck should shuffle during construction and provide draw() and is_empty() methods -- keep it simple.',
        'Validate that the asker holds the requested rank before allowing the ask -- this is a core rule of Go Fish that prevents cheating.',
        'Use a defaultdict(list) in the Player to group cards by rank for efficient has_rank(), give_cards(), and book detection.',
        'Handle the edge case where a player runs out of cards mid-game: they should draw from the deck if cards remain, or skip turns if the deck is empty.',
        'The game ends when the deck is empty AND all players have empty hands -- not just when the deck runs out (players may still have cards to ask for).'
      ]
    },
    {
      id: 'access-control-tree',
      isNew: true,
      title: 'Access Control Tree',
      subtitle: 'Hierarchical Permissions',
      icon: 'gitBranch',
      color: '#6d28d9',
      difficulty: 'Medium',
      description: 'Design a tree-based access control system where permissions inherit from parent to child nodes.',

      introduction: `An access control tree represents a hierarchical permission structure, like a file system where folder permissions cascade to contained files. It is a practical LLD question asked at companies building cloud storage (Google Drive, Dropbox), content management systems, and operating systems. Children inherit parent permissions unless explicitly overridden, creating a powerful yet manageable authorization model.

This problem tests your understanding of the Composite Pattern for tree structures (nodes contain children forming a recursive hierarchy), the Chain of Responsibility Pattern for permission resolution (checks cascade up to ancestor nodes until an explicit permission is found), and the Inheritance Pattern where child nodes inherit parent permissions unless explicitly overridden. It also tests the IntEnum usage for permission levels with natural ordering (ADMIN > DELETE > WRITE > READ > NONE).

The key design challenge is efficient permission resolution: when checking if a user can access a leaf resource, the system traverses up the tree until an explicit permission is found at some ancestor level. This means setting WRITE permission on a folder automatically grants WRITE access to all files and subfolders within it. Explicit permissions at lower levels override inherited ones, enabling fine-grained exceptions like "everyone can read this folder, but only admins can write to this specific file."`,

      coreEntities: [
        { name: 'ACLNode', description: 'Tree node representing a resource with optional explicit permissions' },
        { name: 'Permission (Enum)', description: 'READ, WRITE, DELETE, ADMIN with hierarchy' },
        { name: 'ACLEntry', description: 'Maps a user/role to a permission level on a specific node' },
        { name: 'ACLTree', description: 'Tree structure with permission resolution via ancestor traversal' }
      ],

      designPatterns: [
        'Composite Pattern: Tree nodes contain children forming hierarchical structure',
        'Chain of Responsibility: Permission check cascades up to ancestors',
        'Inheritance Pattern: Child nodes inherit parent permissions unless overridden'
      ],

      implementation: `from enum import IntEnum
from typing import Dict, List, Optional, Set

class Permission(IntEnum):
    NONE = 0
    READ = 1
    WRITE = 2
    DELETE = 3
    ADMIN = 4

    def includes(self, other: 'Permission') -> bool:
        return self.value >= other.value

class ACLNode:
    def __init__(self, name: str, parent: 'ACLNode' = None):
        self.name = name
        self.parent = parent
        self.children: Dict[str, 'ACLNode'] = {}
        # Explicit permissions: user_id -> Permission
        self.permissions: Dict[str, Permission] = {}

    def set_permission(self, user_id: str, permission: Permission):
        self.permissions[user_id] = permission

    def remove_permission(self, user_id: str):
        self.permissions.pop(user_id, None)

    def get_explicit_permission(self, user_id: str) -> Optional[Permission]:
        return self.permissions.get(user_id)

    def add_child(self, name: str) -> 'ACLNode':
        child = ACLNode(name, parent=self)
        self.children[name] = child
        return child

class ACLTree:
    def __init__(self, root_name: str = "/"):
        self.root = ACLNode(root_name)

    def resolve_permission(self, node: ACLNode, user_id: str) -> Permission:
        """Walk up the tree to find the effective permission for a user."""
        current = node
        while current is not None:
            explicit = current.get_explicit_permission(user_id)
            if explicit is not None:
                return explicit
            current = current.parent
        return Permission.NONE  # No permission found

    def check_access(self, node: ACLNode, user_id: str,
                     required: Permission) -> bool:
        effective = self.resolve_permission(node, user_id)
        return effective.includes(required)

    def get_node(self, path: str) -> Optional[ACLNode]:
        """Get node by path like '/folder1/subfolder/file'."""
        parts = [p for p in path.split('/') if p]
        current = self.root
        for part in parts:
            if part not in current.children:
                return None
            current = current.children[part]
        return current

    def create_path(self, path: str) -> ACLNode:
        """Create all nodes along the path if they don't exist."""
        parts = [p for p in path.split('/') if p]
        current = self.root
        for part in parts:
            if part not in current.children:
                current.add_child(part)
            current = current.children[part]
        return current

    def list_accessible(self, node: ACLNode, user_id: str,
                        min_permission: Permission = Permission.READ) -> List[str]:
        """List all children accessible by user with at least given permission."""
        result = []
        for name, child in node.children.items():
            if self.check_access(child, user_id, min_permission):
                result.append(name)
        return result`,

      functionalRequirements: [
        'Create hierarchical resource tree with nested nodes (like a file system)',
        'Set explicit permissions for users on any node in the tree',
        'Resolve effective permissions by walking up to ancestors',
        'Check if a user has at least a required permission level on a resource',
        'List accessible children for a user at any node',
        'Create paths dynamically, auto-creating intermediate nodes'
      ],

      nonFunctionalRequirements: [
        'O(d) permission resolution where d is the depth of the tree',
        'Support permission overrides at any level (child overrides parent)',
        'Handle deep hierarchies efficiently (path-based traversal)',
        'Thread-safe permission modifications'
      ],

      keyQuestions: [
        {
          question: 'Why use IntEnum with includes() for permission levels instead of separate boolean flags?',
          answer: 'IntEnum with ordered levels (NONE=0 < READ=1 < WRITE=2 < DELETE=3 < ADMIN=4) models the common permission hierarchy where higher levels implicitly include lower ones. WRITE permission includes READ ability, ADMIN includes everything. The includes() method (self.value >= other.value) enables a single comparison to check any permission level. Separate boolean flags (can_read, can_write, can_delete, can_admin) require checking multiple flags and do not naturally express the hierarchy. The IntEnum approach also stores permissions as a single integer per user per node, while boolean flags require 4 booleans. The tradeoff is that IntEnum cannot express non-hierarchical permissions (e.g., WRITE without READ), but this is rare in practice.'
        },
        {
          question: 'How would you extend this to support group-based permissions in addition to user permissions?',
          answer: 'Add a Group class that contains a set of user IDs. Each ACLNode would have both user_permissions and group_permissions dictionaries. During resolution, check user permissions first (most specific), then group permissions, then walk up to the parent. When a user belongs to multiple groups with different permissions on the same node, use the maximum permission level (most permissive). This mirrors how Unix file permissions work with user, group, and other levels. The resolution order (user > group > inherited) ensures that specific permissions always override broader ones.'
        },
        {
          question: 'What are the tradeoffs of eager permission propagation vs. lazy ancestor traversal?',
          answer: 'Lazy ancestor traversal (as implemented) computes the effective permission on each check by walking up the tree. This is O(d) per check where d is the tree depth, but uses no additional storage and handles permission changes instantly. Eager propagation pre-computes and caches effective permissions at every node, making checks O(1) but requiring propagation updates whenever a permission changes at any ancestor (O(n) where n is the number of descendants). For read-heavy workloads with infrequent permission changes, eager propagation with caching is faster. For write-heavy workloads or deep trees where permission changes are frequent, lazy traversal is more practical.'
        }
      ],

      tips: [
        'Model permissions as IntEnum with ordered values so that higher levels automatically include lower ones via simple integer comparison.',
        'The resolve_permission method should traverse up from the node to the root, stopping at the first explicit permission found -- this is the Chain of Responsibility pattern.',
        'Implement create_path() to auto-create intermediate nodes when setting permissions deep in the hierarchy, similar to mkdir -p.',
        'Consider caching resolved permissions at frequently accessed nodes and invalidating the cache when ancestor permissions change.',
        'Test edge cases: permission on root node (applies to everything), explicit NONE permission (blocks access even if parent allows it), and nodes with no explicit permissions anywhere in their ancestry.'
      ]
    },
    {
      id: 'active-users',
      isNew: true,
      title: 'Active Users in N Minutes',
      subtitle: 'Sliding Window Counter',
      icon: 'users',
      color: '#0e7490',
      difficulty: 'Medium',
      description: 'Design a system to track and query the number of active users within a sliding time window.',

      introduction: `Tracking active users in a sliding time window is a common requirement for dashboards, rate limiting, and analytics. It is a practical LLD question asked at companies with large user bases (social media, streaming platforms, SaaS products) because it combines data structure design with time-series thinking. The challenge is efficiently counting unique users who were active in the last N minutes without storing every individual event indefinitely.

This problem tests your understanding of the Sliding Window Pattern with time-bucketed data structures, the Strategy Pattern for different counting strategies (exact set-based counting vs. probabilistic HyperLogLog), and the Cleanup Pattern for periodic removal of expired data. It also tests your ability to make tradeoff decisions between memory usage, counting accuracy, and query performance at different scales.

The key data structures are: a sliding window with time-bucketed sets for exact unique counts at moderate scale (up to millions of users), and HyperLogLog for approximate unique counts at massive scale (billions of events with only 12KB of memory). The bucketed approach divides time into fixed-size intervals (e.g., 1-minute buckets), each containing a set of user IDs seen during that interval. Querying the active count unions all buckets within the window.`,

      coreEntities: [
        { name: 'ActivityTracker', description: 'Main class recording user activity and answering window queries' },
        { name: 'TimeBucket', description: 'Set of user IDs active within a time granularity (e.g., 1 minute)' },
        { name: 'SlidingWindow', description: 'Collection of time buckets spanning the query window' }
      ],

      designPatterns: [
        'Sliding Window Pattern: Time-bucketed counters for efficient range queries',
        'Strategy Pattern: Different counting strategies (exact set, HyperLogLog)',
        'Cleanup Pattern: Periodic removal of expired time buckets'
      ],

      implementation: `from collections import defaultdict
from datetime import datetime, timedelta
from typing import Set, Dict
from threading import Lock
import time

class ActivityTracker:
    def __init__(self, bucket_size_seconds: int = 60):
        self.bucket_size = bucket_size_seconds
        self.buckets: Dict[int, Set[str]] = defaultdict(set)
        self.lock = Lock()

    def _get_bucket_key(self, timestamp: datetime = None) -> int:
        if timestamp is None:
            timestamp = datetime.now()
        epoch = int(timestamp.timestamp())
        return epoch - (epoch % self.bucket_size)

    def record_activity(self, user_id: str, timestamp: datetime = None):
        """Record that a user was active at the given time."""
        with self.lock:
            bucket_key = self._get_bucket_key(timestamp)
            self.buckets[bucket_key].add(user_id)

    def get_active_users(self, window_minutes: int) -> int:
        """Count unique active users in the last N minutes."""
        with self.lock:
            now = datetime.now()
            cutoff = now - timedelta(minutes=window_minutes)
            cutoff_key = self._get_bucket_key(cutoff)

            unique_users: Set[str] = set()
            for bucket_key, users in self.buckets.items():
                if bucket_key >= cutoff_key:
                    unique_users.update(users)

            return len(unique_users)

    def get_active_user_ids(self, window_minutes: int) -> Set[str]:
        """Get the set of unique active user IDs."""
        with self.lock:
            now = datetime.now()
            cutoff = now - timedelta(minutes=window_minutes)
            cutoff_key = self._get_bucket_key(cutoff)

            unique_users: Set[str] = set()
            for bucket_key, users in self.buckets.items():
                if bucket_key >= cutoff_key:
                    unique_users.update(users)

            return unique_users

    def cleanup(self, retain_minutes: int = 60):
        """Remove buckets older than retain_minutes."""
        with self.lock:
            cutoff = datetime.now() - timedelta(minutes=retain_minutes)
            cutoff_key = self._get_bucket_key(cutoff)
            expired = [k for k in self.buckets if k < cutoff_key]
            for k in expired:
                del self.buckets[k]

    def get_activity_histogram(self, window_minutes: int) -> Dict[int, int]:
        """Get count of active users per bucket over the window."""
        with self.lock:
            now = datetime.now()
            cutoff = now - timedelta(minutes=window_minutes)
            cutoff_key = self._get_bucket_key(cutoff)

            histogram = {}
            for bucket_key, users in sorted(self.buckets.items()):
                if bucket_key >= cutoff_key:
                    histogram[bucket_key] = len(users)
            return histogram`,

      functionalRequirements: [
        'Record user activity events with timestamps',
        'Query the count of unique active users in the last N minutes',
        'Return the set of active user IDs for a given time window',
        'Generate activity histograms showing user counts per time bucket',
        'Clean up expired buckets to prevent unbounded memory growth'
      ],

      nonFunctionalRequirements: [
        'Thread-safe recording and querying for concurrent web servers',
        'O(W) query time where W is the number of buckets in the window',
        'Memory bounded by cleanup of expired buckets',
        'Configurable bucket granularity for precision vs. memory tradeoff'
      ],

      keyQuestions: [
        {
          question: 'Why use time-bucketed sets instead of a single global set with timestamps per user?',
          answer: 'A single global set mapping user_id to last_active_timestamp requires scanning all users to count those active within the window -- O(total_users). Time-bucketed sets allow the query to union only the buckets within the window -- O(W * average_bucket_size) where W is typically small (e.g., 60 buckets for 60 minutes at 1-minute granularity). Cleanup is also more efficient: drop entire expired buckets in O(1) rather than scanning individual entries. The tradeoff is that users active across bucket boundaries are stored in multiple buckets, slightly increasing memory usage, but the query speed improvement far outweighs this cost.'
        },
        {
          question: 'How would you extend this to handle millions of users per minute at web scale?',
          answer: 'At web scale, exact unique counting becomes memory-prohibitive (storing millions of user IDs per bucket). Switch to the HyperLogLog probabilistic data structure, which estimates unique counts using only about 12KB of memory regardless of the number of users, with approximately 0.81% standard error. Each bucket stores a HyperLogLog instead of a set. For the query, merge the HyperLogLogs across the window buckets. Redis provides built-in HyperLogLog support via PFADD and PFCOUNT commands. The tradeoff is approximate counts (you cannot retrieve individual user IDs), but for dashboard analytics, 99% accuracy is usually sufficient.'
        },
        {
          question: 'What are the tradeoffs of smaller vs. larger bucket sizes?',
          answer: 'Smaller buckets (e.g., 10 seconds) provide finer-grained time resolution for histograms and more precise window boundaries, but require more buckets per window (360 buckets for a 1-hour window) and more memory. Larger buckets (e.g., 5 minutes) use less memory and fewer buckets but provide coarser resolution and less precise window boundaries (a 5-minute bucket at the window edge might include users from slightly outside the window). The optimal bucket size depends on the use case: real-time dashboards need small buckets (10-60 seconds), while daily analytics can use large buckets (1-5 minutes). Memory usage scales linearly with the number of buckets.'
        }
      ],

      tips: [
        'Use epoch-based bucket keys (epoch_seconds - epoch_seconds % bucket_size) for consistent bucket assignment regardless of when the system started.',
        'Always acquire the lock for both recording and querying to ensure consistent reads during concurrent writes.',
        'Implement a cleanup method that runs periodically (or lazily on each query) to remove buckets older than the maximum query window.',
        'The get_active_users method should union all sets in the window for exact unique counts -- do not simply sum bucket sizes, as users may appear in multiple buckets.',
        'Consider providing both count (just the number) and IDs (the actual user set) methods, since count-only can be optimized with HyperLogLog while IDs requires exact sets.'
      ]
    },
    {
      id: 'actor-component',
      isNew: true,
      title: 'Actor Component Model',
      subtitle: 'Concurrent Message Passing',
      icon: 'cpu',
      color: '#c026d3',
      difficulty: 'Hard',
      description: 'Design an actor-based concurrency model where actors communicate via asynchronous message passing.',

      introduction: `The Actor Model is a concurrency paradigm where independent actors communicate through asynchronous messages. It is an advanced LLD question that tests your understanding of concurrent system design without shared mutable state. Each actor has a mailbox (message queue), processes messages sequentially, and can create child actors. This eliminates shared mutable state and the need for locks, making concurrent programs easier to reason about.

Used by frameworks like Akka (Scala/Java), Erlang/OTP, and Microsoft Orleans, the actor model is ideal for building fault-tolerant, distributed systems. This problem tests your understanding of the Actor Pattern itself (message-driven concurrency), the Supervisor Pattern for fault tolerance (parent actors handle child failures via restart, stop, or escalation strategies), Location Transparency (ActorRef hides whether an actor is local or remote), and the Tell Pattern (fire-and-forget async messaging without blocking).

The key challenges are: implementing the message dispatch loop (each actor processes messages sequentially from its mailbox), handling dead letters (messages sent to actors that have been stopped), building supervision hierarchies for fault tolerance (when an actor crashes, its supervisor decides whether to restart, stop, or escalate), and managing the actor lifecycle (creation, stopping, and cleanup). The actor system must also provide efficient thread utilization since running one thread per actor does not scale to millions of actors.`,

      coreEntities: [
        { name: 'Actor', description: 'Independent computation unit with mailbox and message handler' },
        { name: 'ActorRef', description: 'Handle for sending messages to an actor (hides location)' },
        { name: 'Message', description: 'Immutable data sent between actors' },
        { name: 'Mailbox', description: 'Thread-safe message queue for each actor' },
        { name: 'ActorSystem', description: 'Container managing actor lifecycle and thread pool' },
        { name: 'Supervisor', description: 'Parent actor that handles child failures' }
      ],

      designPatterns: [
        'Actor Pattern: Message-driven concurrency without shared state',
        'Supervisor Pattern: Parent actors handle child failures (restart, stop, escalate)',
        'Location Transparency: ActorRef hides whether actor is local or remote',
        'Tell Pattern: Fire-and-forget async messaging (no blocking)'
      ],

      implementation: `from abc import ABC, abstractmethod
from queue import Queue
from threading import Thread, Event
from typing import Any, Dict, Optional, Callable
from dataclasses import dataclass
import uuid

@dataclass
class Message:
    content: Any
    sender: Optional['ActorRef'] = None

class ActorRef:
    def __init__(self, actor_id: str, mailbox: Queue):
        self.actor_id = actor_id
        self._mailbox = mailbox

    def tell(self, message: Any, sender: 'ActorRef' = None):
        self._mailbox.put(Message(content=message, sender=sender))

class Actor(ABC):
    def __init__(self):
        self.self_ref: Optional[ActorRef] = None
        self.context: Optional['ActorContext'] = None

    @abstractmethod
    def receive(self, message: Message):
        pass

    def create_child(self, actor_class: type, name: str = None) -> ActorRef:
        return self.context.create_actor(actor_class, name)

class ActorContext:
    def __init__(self, system: 'ActorSystem'):
        self.system = system

    def create_actor(self, actor_class: type, name: str = None) -> ActorRef:
        return self.system.create_actor(actor_class, name)

class ActorCell:
    """Internal wrapper managing an actor's lifecycle."""
    def __init__(self, actor: Actor, mailbox: Queue, actor_ref: ActorRef):
        self.actor = actor
        self.mailbox = mailbox
        self.actor_ref = actor_ref
        self._stop_event = Event()
        self._thread: Optional[Thread] = None

    def start(self):
        self._thread = Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        while not self._stop_event.is_set():
            try:
                message = self.mailbox.get(timeout=0.1)
                try:
                    self.actor.receive(message)
                except Exception as e:
                    print(f"Actor {self.actor_ref.actor_id} failed: {e}")
            except Exception:
                continue  # Queue timeout

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=2)

class ActorSystem:
    def __init__(self, name: str = "default"):
        self.name = name
        self.actors: Dict[str, ActorCell] = {}
        self._dead_letters: Queue = Queue()

    def create_actor(self, actor_class: type, name: str = None) -> ActorRef:
        actor_id = name or f"{actor_class.__name__}-{uuid.uuid4().hex[:8]}"
        mailbox = Queue()
        actor_ref = ActorRef(actor_id, mailbox)

        actor = actor_class()
        actor.self_ref = actor_ref
        actor.context = ActorContext(self)

        cell = ActorCell(actor, mailbox, actor_ref)
        self.actors[actor_id] = cell
        cell.start()
        return actor_ref

    def stop_actor(self, actor_id: str):
        cell = self.actors.pop(actor_id, None)
        if cell:
            cell.stop()

    def shutdown(self):
        for actor_id in list(self.actors.keys()):
            self.stop_actor(actor_id)

# Example usage:
class EchoActor(Actor):
    def receive(self, message: Message):
        print(f"Echo: {message.content}")
        if message.sender:
            message.sender.tell(f"Echo: {message.content}", self.self_ref)`,

      functionalRequirements: [
        'Create actors from actor classes and assign unique IDs',
        'Send asynchronous messages between actors via ActorRef',
        'Each actor processes messages sequentially from its mailbox',
        'Actors can create child actors through their context',
        'Stop individual actors or shut down the entire actor system',
        'Handle dead letters (messages to stopped actors)'
      ],

      nonFunctionalRequirements: [
        'Thread-safe message delivery via concurrent queues',
        'Graceful shutdown with timeout for actor message processing',
        'No shared mutable state between actors',
        'Fault isolation: one actor\'s failure should not crash others'
      ],

      keyQuestions: [
        {
          question: 'Why does the Actor Model eliminate the need for locks?',
          answer: 'Each actor processes messages sequentially from its own mailbox, meaning only one message is handled at a time within a single actor. Since no two threads ever access the same actor\'s state simultaneously, there is no shared mutable state and therefore no need for locks, mutexes, or synchronization primitives. Communication between actors happens exclusively through immutable messages, which are inherently thread-safe. This makes concurrent programs much easier to reason about: each actor is effectively single-threaded. The tradeoff is that you must decompose your problem into independent actors that communicate via messages, which requires a different mental model than shared-memory concurrency.'
        },
        {
          question: 'How would you extend this to support supervision hierarchies for fault tolerance?',
          answer: 'Add a Supervisor mixin or base class that defines a supervision strategy for handling child actor failures. Common strategies are: OneForOneStrategy (restart only the failed child), AllForOneStrategy (restart all children when one fails), and EscalateStrategy (propagate the failure to the supervisor\'s own supervisor). When an actor\'s receive() method throws an exception, the ActorCell catches it and notifies the parent supervisor. The supervisor applies its strategy: restart creates a new actor instance with the same mailbox, stop permanently removes the actor, and escalate passes the failure up the hierarchy. Akka and Erlang/OTP use this exact pattern for building self-healing systems.'
        },
        {
          question: 'What are the tradeoffs of one-thread-per-actor vs. a shared thread pool?',
          answer: 'One-thread-per-actor (as shown) is simple but does not scale: 10,000 actors would require 10,000 OS threads, which exhausts system resources. A shared thread pool (used by Akka) assigns actors to threads only when they have messages to process. When an actor\'s mailbox has messages, it is scheduled on a pool thread; when the mailbox is empty, the actor releases the thread for others. This allows millions of actors on a modest thread pool (e.g., 8-16 threads). The tradeoff is more complex scheduling logic and the need to prevent actors from blocking threads (long-running receive handlers block the thread for all actors sharing it). Akka solves this with configurable dispatchers and async message processing.'
        }
      ],

      tips: [
        'ActorRef should be the only way to interact with an actor -- never expose the Actor instance directly. This enforces message-based communication.',
        'Messages should be immutable (use @dataclass(frozen=True) or namedtuples) to prevent actors from accidentally sharing mutable state.',
        'Use a daemon thread for each actor so the actor system can shut down cleanly even if actors are blocked waiting for messages.',
        'Implement a dead letter queue for messages sent to stopped actors -- this helps with debugging message routing issues in complex systems.',
        'For production use, replace one-thread-per-actor with a thread pool executor that schedules actors cooperatively when their mailboxes have messages.'
      ]
    },
  ];

  // Concurrency Topics

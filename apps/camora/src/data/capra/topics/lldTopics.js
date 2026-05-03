// Low-level design learning topics: OOP, Design Principles, UML, and Design Patterns

export const lldCategories = [
  { id: 'oop', name: 'Object-Oriented Programming', icon: 'box', color: '#3b82f6' },
  { id: 'principles', name: 'Design Principles', icon: 'compass', color: '#10b981' },
  { id: 'uml', name: 'UML Diagrams', icon: 'layers', color: '#8b5cf6' },
  { id: 'patterns-creational', name: 'Creational Patterns', icon: 'puzzle', color: '#f59e0b' },
  { id: 'patterns-structural', name: 'Structural Patterns', icon: 'link', color: '#06b6d4' },
  { id: 'patterns-behavioral', name: 'Behavioral Patterns', icon: 'gitBranch', color: '#ef4444' },
];

export const lldCategoryMap = {
  // OOP
  'classes-objects': 'oop',
  'interfaces': 'oop',
  'inheritance': 'oop',
  'polymorphism': 'oop',
  'abstraction': 'oop',
  'encapsulation': 'oop',
  'aggregation': 'oop',
  'composition': 'oop',
  'association': 'oop',
  // Design Principles
  'dry': 'principles',
  'kiss': 'principles',
  'yagni': 'principles',
  'law-of-demeter': 'principles',
  'srp': 'principles',
  'ocp': 'principles',
  'lsp': 'principles',
  'isp': 'principles',
  'dip': 'principles',
  'solid-summary': 'principles',
  // UML Diagrams
  'class-diagram': 'uml',
  'use-case-diagram': 'uml',
  'sequence-diagram': 'uml',
  'activity-diagram': 'uml',
  'state-diagram': 'uml',
  // Creational Patterns
  'singleton': 'patterns-creational',
  'factory-method': 'patterns-creational',
  'abstract-factory': 'patterns-creational',
  'builder': 'patterns-creational',
  'prototype': 'patterns-creational',
  // Structural Patterns
  'adapter': 'patterns-structural',
  'facade': 'patterns-structural',
  'decorator-pattern': 'patterns-structural',
  'composite': 'patterns-structural',
  'proxy': 'patterns-structural',
  'bridge': 'patterns-structural',
  'flyweight': 'patterns-structural',
  // Behavioral Patterns
  'iterator': 'patterns-behavioral',
  'observer': 'patterns-behavioral',
  'strategy': 'patterns-behavioral',
  'command': 'patterns-behavioral',
  'state-pattern': 'patterns-behavioral',
  'template-method': 'patterns-behavioral',
  'visitor': 'patterns-behavioral',
  'mediator': 'patterns-behavioral',
  'memento': 'patterns-behavioral',
  'chain-of-responsibility': 'patterns-behavioral',
};

export const lldTopics = [
  // ─────────────────────────────────────────
  // OOP Topics
  // ─────────────────────────────────────────
  {
    id: 'classes-objects',
    title: 'Classes & Objects',
    icon: 'box',
    color: '#3b82f6',
    questions: 8,
    description: 'The foundational building blocks of object-oriented programming.',

    introduction: `Classes and objects form the bedrock of object-oriented programming. A class is a blueprint that defines the structure and behavior of a concept, while an object is a concrete instance of that blueprint living in memory. Think of a class as the architectural plan for a house and each actual house built from those plans as an object.

In practice, classes bundle together related data (attributes) and the operations that act on that data (methods). This bundling is what allows us to model real-world entities in code. A BankAccount class might hold a balance attribute and expose deposit and withdraw methods, keeping the logic and state tightly coupled.

Understanding the distinction between class-level (static) members and instance-level members is critical for interviews. Static members belong to the class itself and are shared across all instances, while instance members belong to each individual object. Constructors, destructors, and the lifecycle of objects are also frequent interview topics.`,

    keyQuestions: [
      {
        question: 'What is the difference between a class and an object?',
        answer: `A class is a compile-time construct that defines a type. It specifies what attributes an entity has and what operations it supports, but it occupies no runtime memory for data storage on its own. An object is a runtime entity created from a class via instantiation (using the "new" keyword in Java/C++ or calling the class in Python). Each object has its own copy of instance attributes stored at a unique memory address.

For example, a Dog class might declare attributes like name and breed. Creating "dog1 = Dog('Rex', 'Labrador')" and "dog2 = Dog('Max', 'Poodle')" yields two separate objects, each with their own name and breed values but sharing the same method definitions from the Dog class.`
      },
      {
        question: 'What are constructors, and why do they matter?',
        answer: `A constructor is a special method invoked automatically when an object is created. Its primary job is to initialize the object's state by assigning values to its attributes. In Java and C++ this is a method matching the class name; in Python it is __init__.

Constructors matter because they enforce invariants from the moment an object exists. Without a constructor, you could create a BankAccount with no balance, leading to undefined behavior. Constructors can be overloaded to support different creation patterns (default constructor, parameterized constructor, copy constructor). Some languages also support destructor methods (__del__ in Python, destructors in C++) that run when an object is garbage-collected or goes out of scope, useful for releasing resources like file handles or database connections.`
      },
      {
        question: 'When should you use static members vs instance members?',
        answer: `Use static members when the data or behavior belongs to the concept itself rather than to any single instance. A counter tracking how many objects have been created, a utility method that does not depend on any instance state, or a constant shared by all instances are all good candidates for static members.

Use instance members when the data varies per object. Each User object needs its own email, each Order needs its own total. A common mistake is making something static to avoid passing references around, which introduces hidden global state and makes testing harder. In interviews, a typical example is: a Student class should have instance fields for name and GPA, but a static field for totalStudents that increments in the constructor.`
      },
      {
        question: 'What is the relationship between classes and memory?',
        answer: `When a class is loaded, its method definitions and static members are stored in a shared memory area (the method area or metaspace in Java). When you create an object, memory is allocated on the heap for that object's instance variables. The object holds a reference (pointer) to its class so it can locate its method implementations.

In languages with garbage collection (Java, Python, C#), objects on the heap are automatically freed when no live references point to them. In C++, the programmer manages memory explicitly with new/delete or uses smart pointers (unique_ptr, shared_ptr). Understanding this distinction is important for interview discussions about memory leaks, dangling pointers, and performance trade-offs.`
      }
    ],

    tips: [
      'Always initialize all fields in the constructor to avoid partially constructed objects',
      'Prefer immutable objects when possible by making fields final/readonly and not providing setters',
      'Use meaningful class names that represent a single concept, not vague names like "Manager" or "Handler"',
      'Keep classes small and focused; if a class grows beyond 200-300 lines, consider splitting it',
      'In interviews, draw out the class with its fields and methods before writing code'
    ],

    sampleQuestions: [
      'Design a class hierarchy for a library management system',
      'What is the difference between a shallow copy and a deep copy of an object?',
      'How does object creation differ between Java, Python, and C++?',
      'Explain the purpose of the toString/repr method and when you would override it',
      'What happens in memory when you assign one object variable to another?'
    ]
  },
  {
    id: 'interfaces',
    title: 'Interfaces',
    icon: 'box',
    color: '#3b82f6',
    questions: 7,
    description: 'Contracts that define what a class must do without specifying how.',

    introduction: `An interface defines a contract: a set of method signatures that any implementing class must provide. It specifies what operations are available without dictating how those operations work internally. Think of a wall power outlet as an interface. Any appliance with the correct plug shape can connect, regardless of whether it is a lamp, a toaster, or a phone charger. The outlet defines the contract; the devices fulfill it differently.

Interfaces are central to writing flexible, testable software. When you code to an interface rather than a concrete class, you can swap implementations without changing the calling code. A PaymentProcessor interface lets you switch between StripeProcessor and PayPalProcessor by simply injecting a different implementation. This is the foundation of dependency injection and many design patterns.

In Java, interfaces are declared with the "interface" keyword. In Python, you achieve the same effect with abstract base classes (ABC) or simply by convention (duck typing). In Go, interfaces are satisfied implicitly. Understanding these differences across languages is valuable in interviews, especially when discussing trade-offs between explicit and implicit contracts.`,

    keyQuestions: [
      {
        question: 'What is the difference between an interface and an abstract class?',
        answer: `An interface is a pure contract with no state and (traditionally) no implementation. An abstract class can have both abstract methods (no body) and concrete methods (with a body), plus instance variables. A class can implement multiple interfaces but typically extends only one abstract class.

Use an interface when you want to define a capability that many unrelated classes can share, like Serializable or Comparable. Use an abstract class when classes share a common base with some default behavior. For example, an abstract Shape class with a concrete getColor() method and abstract area() is appropriate because all shapes share color logic but compute area differently. Since Java 8+, interfaces can have default methods, blurring the line, but the intent differs: interfaces define capabilities, abstract classes define family hierarchies.`
      },
      {
        question: 'Why should you program to an interface rather than an implementation?',
        answer: `Programming to an interface decouples your code from specific implementations. If your service method takes a List interface as a parameter, callers can pass an ArrayList, LinkedList, or any custom list. If you typed the parameter as ArrayList, you would be locked to that specific class.

This principle is critical for testability. When your UserService depends on a UserRepository interface, you can inject a MockUserRepository in tests without hitting a real database. It also enables the Strategy pattern, where algorithms are swapped at runtime through a shared interface. In interviews, this concept often surfaces in discussions about SOLID principles, specifically the Dependency Inversion Principle.`
      },
      {
        question: 'How do interfaces enable multiple inheritance of type?',
        answer: `Most OOP languages forbid multiple class inheritance to avoid the diamond problem (ambiguous method resolution). Interfaces solve this by allowing a class to implement many interfaces without inheriting any implementation. A SmartPhone class can implement Callable, Browsable, and Photographable simultaneously.

In Java, if two interfaces provide default methods with the same signature, the implementing class must override that method to resolve the conflict. In C++, multiple inheritance of classes is allowed but leads to complexity with virtual inheritance. Python uses Method Resolution Order (MRO) with C3 linearization. Interviews often ask you to discuss why interfaces are preferred over multiple inheritance and how different languages handle the conflict.`
      }
    ],

    tips: [
      'Name interfaces after capabilities using adjectives: Iterable, Comparable, Serializable',
      'Keep interfaces small and focused (Interface Segregation Principle)',
      'Use interfaces as parameter and return types in public APIs, not concrete classes',
      'Default methods in Java interfaces are useful for backward-compatible API evolution, not for adding state',
      'In Python, prefer ABCs with @abstractmethod for explicit contracts over relying purely on duck typing in large codebases'
    ],

    sampleQuestions: [
      'When would you choose an interface over an abstract class?',
      'How do default methods in Java 8+ interfaces affect the interface vs abstract class decision?',
      'Explain duck typing and how it relates to interfaces in dynamically typed languages',
      'Design an interface hierarchy for a notification system supporting email, SMS, and push notifications',
      'What is the diamond problem and how do interfaces help avoid it?'
    ]
  },
  {
    id: 'inheritance',
    title: 'Inheritance',
    icon: 'box',
    color: '#3b82f6',
    questions: 8,
    description: 'Mechanism for creating new classes based on existing ones.',

    introduction: `Inheritance allows a new class (child/subclass) to acquire the attributes and methods of an existing class (parent/superclass). It models "is-a" relationships: a Dog is an Animal, a SavingsAccount is a BankAccount. The child class inherits the parent's behavior and can extend or override it to specialize.

The power of inheritance lies in code reuse and establishing type hierarchies. Shared logic lives in the parent class, while each child adds or overrides only what differs. An Animal class might define eat() and sleep(), while Dog overrides speak() to return "Woof" and Cat overrides speak() to return "Meow". This hierarchy lets you write polymorphic code that treats all Animals uniformly.

However, inheritance is frequently overused. The mantra "favor composition over inheritance" exists because deep inheritance trees become fragile: a change in a parent class ripples through every descendant. In interviews, demonstrating that you know when NOT to use inheritance is just as valuable as knowing how to use it. If the relationship is "has-a" rather than "is-a", composition is the better tool.`,

    keyQuestions: [
      {
        question: 'What is the difference between single inheritance and multiple inheritance?',
        answer: `Single inheritance means a class can extend exactly one parent class. Java, C#, and Ruby enforce this to keep the class hierarchy simple and unambiguous. Multiple inheritance allows a class to extend several parent classes simultaneously; C++ and Python support this.

Multiple inheritance introduces the diamond problem: if class D inherits from both B and C, which both inherit from A, and B and C each override a method from A, which version does D get? C++ resolves this with virtual inheritance. Python resolves it with the C3 linearization algorithm that computes a deterministic Method Resolution Order. Java avoids the problem entirely by allowing multiple interface implementation but only single class inheritance.`
      },
      {
        question: 'When should you prefer composition over inheritance?',
        answer: `Prefer composition when the relationship is "has-a" or "uses-a" rather than "is-a." A Car has an Engine; it is not an Engine. Composition means the Car class holds a reference to an Engine object and delegates to it, rather than extending an Engine class.

Composition is also preferred when you need to change behavior at runtime. An inheritance hierarchy is fixed at compile time, but with composition you can swap the Engine object for a different one. The Strategy pattern is a classic example: instead of creating subclasses for each algorithm, you inject different strategy objects. Use inheritance only when there is a genuine type hierarchy with shared behavior, the hierarchy is shallow (2-3 levels at most), and the Liskov Substitution Principle holds.`
      },
      {
        question: 'What is method overriding and how does it differ from method overloading?',
        answer: `Method overriding occurs when a child class provides its own implementation of a method already defined in the parent class. The method signature must match exactly. At runtime, the JVM or interpreter calls the child's version when invoked on a child object, even through a parent-type reference. This is runtime polymorphism.

Method overloading occurs when the same class has multiple methods with the same name but different parameter lists (different types or number of parameters). The compiler selects the correct version based on the arguments at compile time. This is compile-time polymorphism. A key interview point: overriding is resolved at runtime (dynamic dispatch), while overloading is resolved at compile time (static dispatch). In Python, method overloading does not exist natively, but you can simulate it with default parameters or *args.`
      },
      {
        question: 'What access modifiers control inheritance visibility?',
        answer: `In Java, "public" members are accessible everywhere, "protected" members are accessible within the same package and by subclasses, "default" (package-private) members are accessible within the same package only, and "private" members are accessible only within the declaring class. Private members are inherited in the sense that they exist in the child object's memory, but the child class cannot access them directly.

In C++, the inheritance mode (public, protected, private) further controls visibility. Public inheritance preserves access levels, protected inheritance makes public members protected in the child, and private inheritance makes everything private. In Python, there is no true access control; a single underscore prefix is a convention for "protected," and double underscore triggers name mangling for pseudo-private members. Interviews often test understanding of these nuances, especially the difference between "inherited but not accessible" and "not inherited."`
      }
    ],

    tips: [
      'Keep inheritance hierarchies shallow: ideally no more than 3 levels deep',
      'Always ask "is this truly an is-a relationship?" before reaching for inheritance',
      'Use the @Override annotation in Java to catch signature mismatches at compile time',
      'Call the parent constructor explicitly (super().__init__() in Python, super() in Java) to ensure proper initialization',
      'Seal classes you do not intend to be extended (final in Java, sealed in Kotlin/C#)'
    ],

    sampleQuestions: [
      'Explain the diamond problem and how different languages solve it',
      'Why is "favor composition over inheritance" a common design guideline?',
      'Design an inheritance hierarchy for a vehicle rental system',
      'What does the Liskov Substitution Principle say about how subclasses should behave?',
      'How does method resolution order work in Python?'
    ]
  },
  {
    id: 'polymorphism',
    title: 'Polymorphism',
    icon: 'box',
    color: '#3b82f6',
    questions: 7,
    description: 'One interface, many implementations: the ability of objects to take many forms.',

    introduction: `Polymorphism, from the Greek for "many forms," is the principle that lets you treat objects of different classes through a common interface. When you call shape.area(), the actual computation depends on whether the shape is a Circle, Rectangle, or Triangle. The calling code does not need to know the specific type; it simply trusts that every shape knows how to compute its area.

There are two primary types. Compile-time polymorphism (static) is achieved through method overloading and operator overloading, where the compiler decides which method to call based on argument types. Runtime polymorphism (dynamic) is achieved through method overriding and interfaces, where the decision is deferred to runtime based on the actual object type. Runtime polymorphism is the more important form for design interviews.

Polymorphism eliminates conditional logic. Without it, you would write "if shape is circle then compute pi*r^2 else if shape is rectangle then compute l*w..." With polymorphism, each shape class encapsulates its own area logic, and new shapes can be added without touching existing code. This is the essence of the Open/Closed Principle.`,

    keyQuestions: [
      {
        question: 'What are the different types of polymorphism?',
        answer: `There are four recognized forms. Ad-hoc polymorphism includes method overloading (same name, different parameters) and operator overloading (+ means different things for integers vs strings). Subtype polymorphism (the most important for OOP) means a child class object can be used wherever a parent type is expected. Parametric polymorphism means writing code that works with any type via generics (List<T> in Java, templates in C++). Coercion polymorphism means automatic type conversion, like int to float in arithmetic.

In interviews, subtype polymorphism is what matters most. The ability to store a Dog in an Animal variable and have the correct speak() method called at runtime is the foundation of extensible design. When interviewers say "polymorphism," they almost always mean subtype polymorphism through method overriding.`
      },
      {
        question: 'How does dynamic dispatch work under the hood?',
        answer: `In languages like Java and C++, each class that has virtual methods maintains a virtual method table (vtable). The vtable is an array of function pointers, one for each virtual method. When a child class overrides a method, its vtable entry for that method points to the child's implementation instead of the parent's.

When you call animal.speak() through a parent-type reference, the runtime looks up the object's actual class, finds its vtable, and invokes the function pointer at the speak() slot. This lookup adds a tiny overhead compared to a direct function call, which is why C++ distinguishes between virtual and non-virtual methods. Java makes all non-static, non-final methods virtual by default. Python uses its MRO and attribute lookup chain rather than vtables, but the concept is similar.`
      },
      {
        question: 'How does polymorphism help eliminate switch/case or if/else chains?',
        answer: `Consider a payment system that processes CreditCard, PayPal, and BankTransfer. Without polymorphism, you would write a processPay function with "if type == CREDIT_CARD ... elif type == PAYPAL ... elif type == BANK_TRANSFER ..." Every time you add a new payment method, you modify this function, violating the Open/Closed Principle.

With polymorphism, you define a PaymentMethod interface with a process() method. Each payment type implements process() with its own logic. The calling code just invokes payment.process() without caring about the concrete type. Adding a new method like CryptoPayment means creating a new class that implements PaymentMethod, with zero changes to existing code. This is cleaner, safer, and far more maintainable.`
      }
    ],

    tips: [
      'Favor runtime polymorphism (method overriding) over switch statements on type',
      'Use abstract classes or interfaces to define the polymorphic contract',
      'Remember that overloading is compile-time and overriding is runtime',
      'In Java, annotate overriding methods with @Override for safety',
      'Test polymorphic behavior by passing different implementations through the same interface reference'
    ],

    sampleQuestions: [
      'What is the difference between compile-time and runtime polymorphism?',
      'How would you refactor a large switch/case block using polymorphism?',
      'Explain virtual method tables and how they enable dynamic dispatch',
      'Can you achieve polymorphism without inheritance?',
      'Give a real-world example where polymorphism simplifies a design'
    ]
  },
  {
    id: 'abstraction',
    title: 'Abstraction',
    icon: 'box',
    color: '#3b82f6',
    questions: 6,
    description: 'Hiding complexity by exposing only essential details.',

    introduction: `Abstraction is the process of hiding implementation complexity and exposing only what users of a component need to know. When you drive a car, you interact with the steering wheel, pedals, and gear shift. You do not need to understand the internal combustion engine, transmission mechanics, or electronic control unit. The car's interface abstracts away its complexity.

In software, abstraction manifests at every level. Functions abstract sequences of operations behind a name. Classes abstract data and behavior behind a public API. Interfaces and abstract classes take this further by defining contracts with no implementation at all, forcing subclasses to fill in the details. A well-designed DatabaseConnection abstract class exposes connect(), query(), and disconnect() while hiding whether the underlying database is PostgreSQL, MySQL, or MongoDB.

Abstraction is not about making things vague; it is about choosing the right level of detail for each audience. A high-level API client should not expose socket management or retry logic. Getting the level of abstraction right is one of the hardest skills in software design and a frequent topic in architecture discussions during interviews.`,

    keyQuestions: [
      {
        question: 'How do abstract classes and interfaces implement abstraction?',
        answer: `Abstract classes define a partial implementation with one or more abstract methods that subclasses must override. They can include concrete methods with default behavior. In Java, you declare them with the "abstract" keyword; in Python, you use ABC and @abstractmethod. You cannot instantiate an abstract class directly.

Interfaces provide pure abstraction: only method signatures with no implementation (ignoring default methods in modern Java). They say "any class implementing this interface guarantees these operations." The key difference is that abstract classes can hold state (fields) and provide shared implementation, while interfaces define pure contracts. Both enforce that consuming code works at the abstract level without depending on concrete details.`
      },
      {
        question: 'What is the difference between abstraction and encapsulation?',
        answer: `Abstraction and encapsulation are complementary but distinct. Abstraction is about deciding what to show: it defines the simplified model that external code interacts with. Encapsulation is about deciding what to hide: it bundles data and methods together and restricts direct access to internal state.

A practical example: a List interface provides abstraction (you know you can add, remove, and iterate), while the ArrayList class provides encapsulation (the internal array, resizing logic, and index management are private). Abstraction is the design-level decision; encapsulation is the implementation-level mechanism. In interviews, conflating these two concepts is a common mistake to avoid.`
      },
      {
        question: 'How do you decide the right level of abstraction?',
        answer: `The right level of abstraction depends on who the consumer is and what they need to accomplish. A library for web developers should abstract HTTP connection pooling but expose request/response control. A library for infrastructure engineers might need to expose connection pool configuration.

Follow these guidelines: hide anything the consumer should not change or does not need to know; expose anything the consumer needs to customize or must handle (like errors). If you find yourself constantly reaching through the abstraction to access internal details, the abstraction is at the wrong level. The Leaky Abstraction concept (coined by Joel Spolsky) warns that all abstractions eventually fail in edge cases, so design for the common case while providing escape hatches for the rest.`
      }
    ],

    tips: [
      'Design your public API first, then implement behind it; this forces you to think at the right level',
      'If your abstraction requires the caller to understand internal details to use it correctly, it is leaky',
      'Use abstract classes when subclasses share significant common behavior; use interfaces when they share only a contract',
      'Name abstract types after concepts (Shape, PaymentMethod) and concrete types after implementations (Circle, StripePayment)',
      'In interviews, demonstrate abstraction by separating "what" from "how" in your class diagrams'
    ],

    sampleQuestions: [
      'What is a leaky abstraction and how do you avoid it?',
      'Compare how Java and Python handle abstract classes',
      'How does abstraction improve code maintainability?',
      'Design an abstraction layer for a multi-cloud storage service',
      'When can too much abstraction be harmful?'
    ]
  },
  {
    id: 'encapsulation',
    title: 'Encapsulation',
    icon: 'box',
    color: '#3b82f6',
    questions: 7,
    description: 'Bundling data with methods and restricting direct access to internals.',

    introduction: `Encapsulation is the practice of bundling data (attributes) and the methods that operate on that data into a single unit (a class) while restricting direct external access to the internal state. The class controls how its data is read and modified through a well-defined public interface, typically using getters and setters.

Consider a bank account. You should not be able to directly set the balance to any arbitrary value. Instead, you interact through deposit() and withdraw() methods that enforce business rules: balances cannot go negative, withdrawals cannot exceed the balance, and every transaction is logged. The balance field is private; the methods are public. This is encapsulation in action.

Encapsulation protects invariants: conditions that must always be true about an object's state. Without it, any part of the codebase can reach into an object and put it in an invalid state. It also enables evolution: you can change the internal representation (replacing an array with a hash map, for instance) without breaking any external code, as long as the public methods behave the same way.`,

    keyQuestions: [
      {
        question: 'What are the access modifiers and when do you use each?',
        answer: `In Java: "private" restricts access to the declaring class only, used for internal state and helper methods. "protected" allows access from subclasses and same-package classes, used for extension points. "default" (no modifier) is package-private, useful for classes that collaborate closely within a package. "public" is accessible from anywhere, used for the class's external API.

The general rule is to start with the most restrictive access level and relax only when necessary. Make fields private. Make methods private unless they are part of the public API. Use protected sparingly, only when subclasses genuinely need direct access. In Python, there are no enforced access controls; a single underscore (_name) is a convention for "internal," and double underscore (__name) triggers name mangling but is still accessible.`
      },
      {
        question: 'Why are getters and setters better than public fields?',
        answer: `Public fields give up all control. Any code anywhere can set a person's age to -500 or a string to null. With a setter, you can validate input (age must be positive), trigger side effects (notify observers on change), add logging, or compute derived values.

Getters protect against exposing mutable internal state. If your class has a private List and your getter returns it directly, callers can modify the list, bypassing your encapsulation. Instead, return an unmodifiable view or a defensive copy. That said, not every field needs explicit getters and setters. In modern Java, records provide concise immutable data carriers. In Python, @property decorators let you add validation later without changing the caller's syntax. The key principle is: control access to state so that invariants are always maintained.`
      },
      {
        question: 'How does encapsulation support the principle of least privilege?',
        answer: `The principle of least privilege states that every component should have access to only the information and resources needed for its legitimate purpose. Encapsulation enforces this by making internal state private and exposing only necessary operations.

If a reporting module only needs to read user data, it should interact through read-only methods. It should not have access to setPassword() or delete(). By designing your class with minimal public surface area, you limit the damage any single component can cause. This is especially important in large codebases where dozens of developers work on different modules. Encapsulation creates boundaries that prevent accidental coupling and make the system easier to reason about, test, and refactor.`
      }
    ],

    tips: [
      'Make all fields private by default; expose them only through methods when there is a clear need',
      'Return defensive copies of mutable objects from getters to prevent external modification',
      'Use immutable objects when possible; they are inherently well-encapsulated since their state cannot change',
      'Avoid creating getters and setters mechanically for every field; only expose what the class contract requires',
      'In Python, use @property to add encapsulation behavior without breaking existing callers'
    ],

    sampleQuestions: [
      'What would break if you made a class\'s fields public instead of private?',
      'How do you prevent a getter from leaking a mutable reference?',
      'Compare encapsulation mechanisms in Java, Python, and JavaScript',
      'Design an encapsulated user account class that enforces password complexity rules',
      'What is the Law of Demeter and how does it relate to encapsulation?'
    ]
  },
  {
    id: 'aggregation',
    title: 'Aggregation',
    icon: 'box',
    color: '#3b82f6',
    questions: 5,
    description: 'A "has-a" relationship where the child can exist independently of the parent.',

    introduction: `Aggregation is a specialized form of association that represents a "has-a" relationship where the contained object can exist independently of the container. A university has professors, but if the university closes, the professors continue to exist as individuals. The university does not own the lifecycle of its professors; it merely references them.

In code, aggregation is typically implemented by passing an existing object into the constructor or setter of the containing object, rather than creating the object internally. A Department class might receive a list of Employee objects through its constructor. The Department holds references to these employees, but it did not create them and will not destroy them. The same Employee could belong to multiple departments or exist with no department at all.

Aggregation is one of the most confused OOP relationships, often mixed up with composition. The distinguishing factor is lifecycle independence. In aggregation, the parts outlive the whole. Understanding this distinction helps you model real-world domains accurately and is a frequent topic in UML and LLD interviews.`,

    keyQuestions: [
      {
        question: 'How is aggregation different from composition?',
        answer: `The key difference is lifecycle coupling. In aggregation, the child object exists independently of the parent. Destroying the parent does not destroy the child. In composition, the child is created and owned by the parent; destroying the parent destroys the child.

Example of aggregation: a Team and Players. If the team is disbanded, the players still exist and can join other teams. The team does not create or destroy players. Example of composition: a House and Rooms. If the house is demolished, the rooms cease to exist. They have no meaning outside the house. In UML, aggregation is shown with an empty diamond at the parent end, while composition uses a filled diamond.`
      },
      {
        question: 'How do you implement aggregation in code?',
        answer: `Aggregation is implemented by receiving objects through constructor parameters, setter methods, or method arguments rather than instantiating them internally. The containing class holds a reference but does not manage the referenced object's creation or destruction.

For example: class Department has a constructor that takes a list of Employee objects. The caller creates the employees first and passes them in. The Department stores references to them. When the Department object is garbage-collected, the Employee objects persist because other references to them still exist. In languages with manual memory management like C++, the aggregating class uses raw pointers or references (not unique_ptr) to signal that it does not own the objects.`
      },
      {
        question: 'When should you use aggregation vs a simple association?',
        answer: `Use aggregation when there is a meaningful "whole-part" or "collection" semantic. A Library aggregates Books; a Playlist aggregates Songs. The container logically groups the parts, even though the parts can exist independently.

Use a plain association when two classes are related but neither is a container. A Student is associated with a Course through enrollment, but neither "contains" the other. Both are independent entities linked by a relationship. The distinction matters for clarity in UML diagrams and domain modeling. In code, the implementation might look similar (both use references), but the conceptual model communicates different things to other developers reading your design.`
      }
    ],

    tips: [
      'Use aggregation when the child object is created outside the parent and passed in',
      'In UML, represent aggregation with an empty (hollow) diamond on the parent side',
      'If deleting the parent should not delete the children, you want aggregation, not composition',
      'A single child object can participate in multiple aggregation relationships simultaneously',
      'In interviews, name real-world examples quickly: Department-Employee, Team-Player, Playlist-Song'
    ],

    sampleQuestions: [
      'Give three real-world examples of aggregation relationships',
      'How would you implement aggregation between a University and Professor classes?',
      'Can a child object belong to multiple parents in aggregation?',
      'How does aggregation appear in a UML class diagram?',
      'When would you choose aggregation over composition?'
    ]
  },
  {
    id: 'composition',
    title: 'Composition',
    icon: 'box',
    color: '#3b82f6',
    questions: 6,
    description: 'A strong "has-a" relationship where the child\'s lifecycle is tied to the parent.',

    introduction: `Composition is a strong form of the "has-a" relationship where the parent object owns and controls the lifecycle of the child objects. When the parent is destroyed, the children are destroyed with it. A Human has a Heart; if the human ceases to exist, the heart (in this modeling context) has no independent existence. The heart is not shared with other humans.

In code, composition means the parent class creates the child objects internally, usually in its constructor. The children are not passed in from outside, and they are not accessible or meaningful outside the context of the parent. A Car class might create its own Engine object in the constructor. The engine is an internal implementation detail of the car.

Composition is the preferred approach for reuse in modern OOP, often expressed as "favor composition over inheritance." Instead of inheriting behavior from a parent class, you compose objects that provide the needed functionality and delegate to them. This gives you more flexibility: you can swap components, combine behaviors from multiple sources, and avoid the fragile base class problem that plagues deep inheritance hierarchies.`,

    keyQuestions: [
      {
        question: 'Why is "favor composition over inheritance" a widely held principle?',
        answer: `Inheritance creates a tight coupling between parent and child. Any change to the parent class ripples into every subclass, and the child is locked into its parent's design decisions at compile time. This is the fragile base class problem.

Composition provides flexibility. The containing class holds references to other objects and delegates to them. You can change the delegated object at runtime, combine behaviors from multiple unrelated sources, and test each component in isolation. For example, instead of creating a FlyingFishRobot through a complex inheritance chain, you compose a Robot with a SwimBehavior and a FlyBehavior, each injected as a dependency. The Strategy and Decorator patterns are both built on this principle.`
      },
      {
        question: 'How do you implement composition in code?',
        answer: `The parent class instantiates the child objects in its own constructor and stores them as private fields. The parent's methods delegate to the children as needed. The children should not be exposed directly to external code.

Example in Python: class Car has __init__ that creates self._engine = Engine() and self._transmission = Transmission() internally. Car.start() calls self._engine.ignite() and self._transmission.engage(). The Engine and Transmission objects are private to Car. In C++, composition is implemented using member objects (not pointers) or unique_ptr to signal exclusive ownership. When Car is destroyed, its Engine and Transmission are automatically destroyed.`
      },
      {
        question: 'How does composition relate to dependency injection?',
        answer: `Composition and dependency injection (DI) work together but serve different purposes. Composition says "this class contains and uses other objects." DI says "pass those objects in from outside rather than creating them internally."

Pure composition (creating objects internally) is simpler but less flexible and harder to test. DI-based composition (receiving objects through the constructor) enables swapping implementations and injecting mocks for testing. In practice, you often use DI for dependencies that may vary (database connections, API clients, strategy objects) and internal composition for objects that are truly implementation details (internal caches, helper objects that should never be swapped). Both approaches maintain the "has-a" semantic.`
      }
    ],

    tips: [
      'Use composition when the child has no meaningful existence outside the parent',
      'In UML, represent composition with a filled (solid) diamond on the parent side',
      'Implement composed objects as private fields created in the constructor',
      'Combine composition with dependency injection for maximum testability and flexibility',
      'When you find yourself building a deep inheritance hierarchy, refactor to composition instead'
    ],

    sampleQuestions: [
      'Refactor a class hierarchy that uses inheritance into one that uses composition',
      'How does composition differ from aggregation in UML?',
      'Design a game character system using composition instead of inheritance',
      'What is the fragile base class problem and how does composition avoid it?',
      'How would you test a class that uses composition internally?'
    ]
  },
  {
    id: 'association',
    title: 'Association',
    icon: 'box',
    color: '#3b82f6',
    questions: 5,
    description: 'A relationship between two classes where each maintains its own lifecycle.',

    introduction: `Association is the most general relationship between two classes. It indicates that instances of one class are connected to instances of another, but neither owns or contains the other. Both objects have independent lifecycles and can exist without the relationship. A Teacher and a Student are associated through a Course, but each can exist independently.

Associations have multiplicity: one-to-one (a Person has one Passport), one-to-many (a Teacher teaches many Students), or many-to-many (Students enroll in many Courses and each Course has many Students). They can also be directional. A unidirectional association means one class knows about the other but not vice versa. A bidirectional association means both classes hold references to each other.

Understanding association and its subtypes (aggregation and composition) is essential for drawing accurate UML diagrams and for translating a real-world domain into code. In interviews, you are often asked to identify relationships between entities in a system design, and correctly choosing between association, aggregation, and composition demonstrates design maturity.`,

    keyQuestions: [
      {
        question: 'What is the relationship between association, aggregation, and composition?',
        answer: `Association is the umbrella concept. It means "these two classes are related." Aggregation is a specialized association that adds "part-of" semantics where the part can exist independently. Composition is a further specialization where the part cannot exist without the whole.

Think of a spectrum of coupling strength. Plain association is the weakest: a Doctor and Patient are related but neither owns the other. Aggregation is medium: a Department has Employees, but employees exist independently. Composition is the strongest: a House has Rooms that cease to exist if the house is demolished. In code, the implementation often looks similar (references between objects), but the semantic meaning and lifecycle management differ. UML captures this visually: plain line for association, hollow diamond for aggregation, filled diamond for composition.`
      },
      {
        question: 'How do you handle bidirectional associations without creating circular dependencies?',
        answer: `Bidirectional associations (where both classes reference each other) require careful management to stay consistent. If a Student adds a Course, the Course must also know about the Student. The typical solution is to designate one side as the "owner" of the relationship and update both sides through that owner.

For example, a method addStudent on the Course class both adds the student to its internal list and calls student.addCourse(this). To prevent infinite loops, the addCourse method on Student checks if the course is already present before calling back. In ORMs like Hibernate/JPA, this is formalized with "owning side" and "inverse side" annotations. In simpler systems, you can use a separate association class (Enrollment) that holds references to both Student and Course, eliminating the bidirectional reference entirely.`
      },
      {
        question: 'What is multiplicity and how does it affect your design?',
        answer: `Multiplicity defines how many instances of one class can be associated with instances of another. Common forms: 1..1 (exactly one), 0..1 (optional, at most one), 1..* (one or more), 0..* (zero or more, often written as just *).

Multiplicity directly affects your data structure choices. A 1..1 relationship can be a simple field reference. A 1..* relationship requires a collection (List, Set). A many-to-many relationship often needs a separate join table in databases or an intermediary class in code. Getting multiplicity wrong leads to bugs: if you model a one-to-one relationship but the real domain is one-to-many, you will lose data. In interviews, always clarify multiplicity when identifying relationships between entities.`
      }
    ],

    tips: [
      'Start by identifying all the entities and draw plain associations; refine to aggregation or composition as you understand lifecycles',
      'Use unidirectional associations by default; only make them bidirectional when both sides genuinely need to navigate to each other',
      'For many-to-many relationships, consider introducing an association class (e.g., Enrollment between Student and Course)',
      'Label associations with the relationship name and multiplicity in UML diagrams',
      'In interviews, discuss how associations map to database foreign keys and join tables'
    ],

    sampleQuestions: [
      'Identify all the associations in an e-commerce system and classify them',
      'How do you implement a many-to-many association in code?',
      'What is the difference between unidirectional and bidirectional association?',
      'When would you introduce an association class?',
      'How do associations translate to database schema design?'
    ]
  },

  // ─────────────────────────────────────────
  // Design Principles
  // ─────────────────────────────────────────
  {
    id: 'dry',
    title: "Don't Repeat Yourself (DRY)",
    icon: 'compass',
    color: '#10b981',
    questions: 5,
    description: 'Every piece of knowledge should have a single, authoritative representation.',

    introduction: `The DRY principle states that every piece of knowledge in a system should have a single, unambiguous, authoritative representation. When the same logic, data, or configuration exists in multiple places, changes require finding and updating every copy. Miss one, and you have inconsistency, which leads to bugs.

DRY is not just about avoiding copy-pasted code. It applies to database schemas (don't store derived data that can be computed), configuration (don't repeat settings across files), documentation (don't restate what the code already says), and even team knowledge (don't rely on tribal knowledge when you can encode rules in code). The principle is about reducing the maintenance burden of change.

However, DRY can be taken too far. Premature abstraction, where you extract a shared function for two pieces of code that happen to look similar but serve different purposes, creates coupling that makes future changes harder. The rule of three is a good heuristic: tolerate duplication twice, but extract on the third occurrence. The goal is not zero duplication; it is ensuring that a single change in requirements requires a single change in code.`,

    keyQuestions: [
      {
        question: 'What is the difference between DRY and WET code?',
        answer: `DRY code has a single source of truth for each piece of logic. WET code ("Write Everything Twice" or "We Enjoy Typing") duplicates logic in multiple places. For example, if your email validation regex appears in both the registration handler and the profile update handler, that is WET. When the validation rule changes, you must find and update both places.

The DRY solution is to extract the validation into a single function (validateEmail) and call it from both handlers. Now a change to the validation rule requires exactly one edit. DRY applies beyond code: if the same business rule is encoded in both the frontend and backend, the backend should be the authority and the frontend should defer to it or share a common validation library.`
      },
      {
        question: 'When can applying DRY actually hurt your codebase?',
        answer: `DRY becomes harmful when you merge two things that look similar but represent different concepts. Suppose you have a function that formats user addresses and another that formats shipping addresses. They look identical today. If you merge them into one function, you couple user and shipping logic. When shipping requires adding a warehouse code field, you either add a conditional (ugly) or split the function again (wasted effort).

This is known as "accidental duplication" vs "true duplication." True duplication means the same business rule is stated twice, and changes to the rule must propagate to both. Accidental duplication means two pieces of code happen to look the same but evolve for different reasons. Only eliminate true duplication. The rule of three helps: wait until you see the same pattern three times before extracting, because by then the pattern has proven stable.`
      },
      {
        question: 'How do you apply DRY across a full-stack application?',
        answer: `In a full-stack app, DRY violations commonly appear in validation (duplicated on frontend and backend), constants (magic numbers repeated in multiple files), data transformations (same mapping logic in different services), and API contracts (URL paths hardcoded in multiple clients).

Solutions include: shared validation libraries (used by both frontend and backend if they share a language), constants files that are imported everywhere, utility functions for common transformations, and API client generators from OpenAPI/Swagger specs. For cross-language stacks, you can use code generation from a single schema definition. The key insight is that DRY is a design principle, not a code-level technique. Think about what changes together and ensure it is defined in one place.`
      }
    ],

    tips: [
      'Follow the rule of three: tolerate duplication twice, extract on the third occurrence',
      'Distinguish between true duplication (same business rule) and accidental duplication (looks similar today)',
      'Extract shared logic into utility functions, base classes, or shared modules',
      'Use constants and configuration files instead of magic numbers scattered through code',
      'DRY applies to data too: do not store values that can be computed from other stored values'
    ],

    sampleQuestions: [
      'Identify DRY violations in a given code snippet and refactor them',
      'What is the rule of three and why is it useful?',
      'How would you share validation logic between a React frontend and a Node.js backend?',
      'When is code duplication acceptable?',
      'How does DRY relate to the Single Responsibility Principle?'
    ]
  },
  {
    id: 'kiss',
    title: 'Keep It Simple Stupid (KISS)',
    icon: 'compass',
    color: '#10b981',
    questions: 5,
    description: 'Prefer simple solutions over unnecessarily complex ones.',

    introduction: `The KISS principle asserts that most systems work best when they are kept simple rather than made complex. Simplicity should be a key goal in design, and unnecessary complexity should be avoided. The principle is attributed to Kelly Johnson, the lead engineer at Lockheed's Skunk Works, who challenged his team to design aircraft maintainable by an average mechanic with basic tools under combat conditions.

In software, KISS means choosing the straightforward solution over the clever one. A simple for loop is better than a chain of three higher-order functions when the loop is easier to read. A relational database is better than a distributed event-sourcing system when your data fits on one server. A flat file is better than a database when you have ten records that change once a month.

The enemy of KISS is resume-driven development: choosing technologies and patterns because they are impressive, not because the problem requires them. Every layer of abstraction, every design pattern, every framework adds cognitive load. Each should earn its place by solving a real problem. In interviews, demonstrating that you can design a simple system that meets the requirements is more impressive than an overengineered one.`,

    keyQuestions: [
      {
        question: 'How do you balance KISS with extensibility?',
        answer: `Design for today's requirements, not hypothetical future ones (this is also YAGNI). Build the simplest system that solves the current problem correctly. When new requirements arrive, refactor to accommodate them.

The key insight is that simple code is easier to refactor than complex code. If you build a simple system and later need to add a caching layer, the refactoring is straightforward because the code is easy to understand. If you pre-built a complex, "extensible" architecture with abstract factories and dependency injection containers for a system that serves 100 users, you wasted effort and made the code harder to change. True extensibility comes from clean, simple code with good separation of concerns, not from premature abstraction.`
      },
      {
        question: 'What are signs that a design is unnecessarily complex?',
        answer: `Red flags include: more than 3-4 levels of indirection to trace a request from entry to outcome, design patterns used without a clear problem they solve, configuration systems more complex than the code they configure, abstract base classes with only one implementation, interfaces with only one implementor and no plans for more, and code that takes longer to understand than to rewrite.

A practical test: if you cannot explain the architecture to a new team member in 15 minutes, it is probably too complex. Another test: if removing a layer of abstraction would not break any feature, it should not exist. Simplicity is not about being simplistic; it is about achieving the same functionality with fewer moving parts.`
      },
      {
        question: 'How does KISS apply to algorithm selection in interviews?',
        answer: `In coding interviews, KISS means starting with the simplest correct solution before optimizing. If a brute force O(n^2) solution solves the problem and passes within constraints, implement it first. Then discuss potential optimizations.

In system design interviews, KISS means starting with a monolithic architecture for small-scale systems rather than jumping to microservices. It means using a single database before introducing read replicas, caches, and sharding. Walk the interviewer through your reasoning: "This simple approach works for 10K users. At 1M users, we would need to add caching here and sharding there." This demonstrates maturity: knowing what is needed at each scale, not just what is possible.`
      }
    ],

    tips: [
      'Start with the simplest solution that works; optimize only when measurements prove it necessary',
      'If you cannot explain your design in one paragraph, it is probably too complex',
      'Prefer standard library tools over custom implementations',
      'Reduce the number of technologies in your stack; each one adds operational complexity',
      'Code should be readable by a junior developer; cleverness is the enemy of maintainability'
    ],

    sampleQuestions: [
      'How would you simplify an over-engineered class hierarchy?',
      'When is it appropriate to add complexity to a design?',
      'Give an example of a design pattern being used unnecessarily',
      'How do you decide between a simple monolith and microservices?',
      'What is the relationship between KISS and technical debt?'
    ]
  },
  {
    id: 'yagni',
    title: "You Aren't Gonna Need It (YAGNI)",
    icon: 'compass',
    color: '#10b981',
    questions: 5,
    description: 'Do not build functionality until it is actually needed.',

    introduction: `YAGNI is an Extreme Programming principle that states you should not add functionality until it is genuinely needed. It directly combats the tendency to build features "just in case" or to design abstractions for requirements that do not exist yet. The cost of unused code is not zero: it must be maintained, tested, understood by new team members, and it increases the surface area for bugs.

The principle stems from the observation that developers are poor at predicting future requirements. Studies show that most speculative features are never used or are needed in a different form than anticipated. Building them upfront wastes development time and creates code that makes the system harder to change when actual requirements arrive.

YAGNI does not mean you should write bad code or ignore obvious extension points. It means you should not build the extension until you need it. Keep your code clean, well-structured, and easy to extend, but do not actually extend it until there is a concrete reason. The distinction is between "easy to add a feature later" (good) and "already added a feature we might need" (YAGNI violation).`,

    keyQuestions: [
      {
        question: 'How do you distinguish between good planning and YAGNI violations?',
        answer: `Good planning means writing clean, decoupled code with clear interfaces so that future changes are easy. A YAGNI violation means actually building the future change before it is needed. For example, designing your payment service behind a PaymentGateway interface is good planning; it makes it easy to add new payment providers. But building a StripeGateway, PayPalGateway, and BitcoinGateway when you only need Stripe today is a YAGNI violation.

The test is simple: does this code serve a current requirement? If yes, build it. If no, do not. Keep the architecture flexible (interfaces, dependency injection, clean boundaries) so that when the requirement arrives, the change is small. This is the sweet spot: prepared for change without pre-building it.`
      },
      {
        question: 'What is the cost of speculative features?',
        answer: `Every line of code has ongoing costs: it must be maintained when dependencies update, tested to prevent regressions, understood by every new team member, and carried through every refactoring. Speculative features multiply this cost for zero current business value.

Additionally, speculative features often encode assumptions about future requirements that turn out to be wrong. When the real requirement arrives, the pre-built solution is a poor fit and must be reworked or removed. You end up spending time three times: building the speculative version, tearing it down, and building the correct version. Teams that practice YAGNI consistently deliver faster because they focus effort on features users actually need.`
      },
      {
        question: 'How does YAGNI interact with SOLID principles?',
        answer: `YAGNI and SOLID are complementary, not contradictory. SOLID tells you how to structure the code you write. YAGNI tells you what code to write. You should write the code needed for current requirements, structured according to SOLID principles.

For example, the Open/Closed Principle says classes should be open for extension but closed for modification. This means structuring your code so that new behavior can be added without changing existing code. YAGNI says do not add that new behavior until it is needed. Together: design the extension point (an interface, a strategy parameter), but do not implement additional strategies until a real requirement demands them.`
      }
    ],

    tips: [
      'Ask "do we need this today?" before adding any feature or abstraction',
      'Writing clean, modular code is not a YAGNI violation; premature feature development is',
      'If you find yourself saying "we might need this later," stop and wait for "later" to arrive',
      'Track how often speculative features are actually used; the data will reinforce YAGNI discipline',
      'In interviews, show restraint by designing for stated requirements rather than imagined ones'
    ],

    sampleQuestions: [
      'Give an example of a YAGNI violation in a real project',
      'How do you handle a manager who wants features built "just in case"?',
      'What is the relationship between YAGNI and iterative development?',
      'How does YAGNI apply to choosing technologies and frameworks?',
      'When might it be worth violating YAGNI?'
    ]
  },
  {
    id: 'law-of-demeter',
    title: 'Law of Demeter',
    icon: 'compass',
    color: '#10b981',
    questions: 5,
    description: 'Only talk to your immediate friends, not to strangers.',

    introduction: `The Law of Demeter (LoD), also known as the principle of least knowledge, states that an object should only communicate with its direct collaborators. Specifically, a method M of an object O should only call methods on: O itself, M's parameters, objects created within M, and O's direct fields. It should not call methods on objects returned by other method calls, which creates chains like a.getB().getC().doSomething().

The classic violation is the "train wreck" pattern: customer.getAddress().getCity().getZipCode(). This chain means your code depends on the internal structure of Customer, Address, and City. If Address stops having a City field, or City stops having a getZipCode method, your code breaks even though it had nothing to do with those changes.

The Law of Demeter reduces coupling. When you follow it, each class depends only on its direct neighbors, not on the entire object graph. Changes to distant classes do not ripple through the system. The trade-off is that you sometimes need to add "pass-through" methods (customer.getZipCode() that delegates to address.getCity().getZipCode()), which can feel like boilerplate. But that boilerplate creates a stable interface that shields callers from structural changes.`,

    keyQuestions: [
      {
        question: 'How do you identify Law of Demeter violations?',
        answer: `Look for method chains where you call a method on the return value of another method: a.getB().getC().doSomething(). Each dot in the chain represents a dependency on another class's structure. The more dots, the more classes your code is coupled to.

Another form is accessing fields of fields: this.manager.department.budget. Your code now depends on the manager having a department field and the department having a budget field. If either changes, your code breaks. To find violations systematically, search for lines with more than one dot (excluding fluent builders and stream operations, which are intentionally designed for chaining). Static analysis tools like PMD or SonarQube can flag these automatically.`
      },
      {
        question: 'How do you fix Law of Demeter violations without creating excessive wrapper methods?',
        answer: `The primary technique is "tell, don't ask." Instead of reaching into an object to get data and then making a decision, tell the object what you want done and let it figure out the details. Instead of if(customer.getAddress().getCity().equals("NYC")), add a method customer.livesIn("NYC") that encapsulates the traversal.

For cases where many callers need different pieces of deep data, consider whether the calling code has the wrong dependency. Maybe it should depend on Address directly rather than reaching through Customer. Or perhaps the data should be passed as a parameter to the method rather than fetched through a chain. The Facade pattern also helps: create a single class that provides a simplified interface to a complex subsystem, so callers interact with the facade instead of navigating the object graph.`
      },
      {
        question: 'When is it acceptable to violate the Law of Demeter?',
        answer: `Fluent APIs and builder patterns intentionally chain method calls: StringBuilder.append("a").append("b").toString(). This is not a violation because each call returns the same object (or a closely related wrapper), not a structurally different object you are navigating into.

Stream and collection operations (list.stream().filter(...).map(...).collect(...)) are also acceptable because they operate on the same conceptual data pipeline. Data transfer objects (DTOs) and value objects used purely for data transport (not behavioral modeling) also get a pass, since they are essentially structured data containers with no behavior to encapsulate. The key question is: does the chain navigate through the internal structure of different business objects? If yes, it is a violation. If no, it is an intentional API design.`
      }
    ],

    tips: [
      'Follow "tell, don\'t ask": tell objects what to do instead of extracting their data and deciding externally',
      'If you see more than one dot in a non-fluent chain, consider refactoring',
      'Add delegate methods on the owning class to hide internal navigation',
      'The Law of Demeter reduces coupling at the cost of more methods; this trade-off is almost always worth it',
      'Fluent builders and stream pipelines are not Law of Demeter violations'
    ],

    sampleQuestions: [
      'Identify Law of Demeter violations in a code snippet and refactor them',
      'What is the "tell, don\'t ask" principle?',
      'How does the Law of Demeter relate to encapsulation?',
      'When is chaining method calls acceptable?',
      'How would you apply the Law of Demeter in a microservices architecture?'
    ]
  },
  {
    id: 'srp',
    title: 'Single Responsibility Principle',
    icon: 'compass',
    color: '#10b981',
    questions: 6,
    description: 'A class should have one, and only one, reason to change.',

    introduction: `The Single Responsibility Principle (SRP) states that a class should have only one reason to change, meaning it should have only one job or responsibility. Robert C. Martin, who formulated the principle, later clarified that "reason to change" means one stakeholder or actor. A class that generates reports and also sends emails has two responsibilities: reporting logic (owned by the analytics team) and email delivery (owned by the infrastructure team). Changes from either team require modifying the same class.

SRP is arguably the most important of the SOLID principles because violations compound rapidly. A class with three responsibilities is modified for three different reasons, tested for three different scenarios, and understood by three different mental models. Every time you change it for one reason, you risk breaking the other two.

Think of SRP as "a class should do one thing well." An InvoiceCalculator computes totals. An InvoicePrinter formats output. An InvoiceEmailer sends it. Each is small, focused, and testable in isolation. When the formatting requirements change, only InvoicePrinter is modified, and the changes to testing, review, and deployment are contained.`,

    keyQuestions: [
      {
        question: 'How do you identify SRP violations?',
        answer: `Several signals indicate SRP violations. The class name contains "And" or "Manager" (UserManagerAndNotifier). The class has methods that are never called together (calculateTax and sendEmail in the same class). Changes for different business reasons touch the same file. The class has too many imports from unrelated modules. The class is hard to name because it does multiple things.

A practical test: describe the class in one sentence without using "and." If you cannot, it likely has multiple responsibilities. Another test: list the class's methods and group them by which team or requirement would trigger a change. If there are multiple groups, the class has multiple responsibilities. For example, a User class with getFullName(), validatePassword(), and saveToDatabase() has at least three: domain logic, security, and persistence.`
      },
      {
        question: 'How do you apply SRP without creating an explosion of tiny classes?',
        answer: `SRP does not mean every class should have only one method. It means every class should have one cohesive purpose. A ShoppingCart class with addItem(), removeItem(), getTotal(), and applyCoupon() has a single responsibility: managing the cart contents and pricing. These methods all change for the same reason (cart business rules).

The explosion of classes happens when you split too finely. If ShoppingCartAdder, ShoppingCartRemover, and ShoppingCartTotalCalculator are separate classes that always change together, you have fragmented a single responsibility. Group by reason-to-change, not by method count. Also, use packages/modules to organize related classes. Having 20 small classes in a well-organized "billing" package is clearer than 5 large classes that each handle multiple billing concerns.`
      },
      {
        question: 'How does SRP apply to functions and modules, not just classes?',
        answer: `SRP scales to every level of code organization. A function should do one thing: compute a value, produce a side effect, or make a decision, but ideally not all three. A module or package should have one area of responsibility: the "auth" module handles authentication, the "billing" module handles payments.

At the microservice level, SRP becomes the guiding principle for service boundaries. A UserService handles user lifecycle, an OrderService handles orders, and a NotificationService handles delivery. Each service has one reason to change and can be developed, deployed, and scaled independently. The principle is fractal: it applies the same way whether you are designing a function, a class, a module, or a service.`
      }
    ],

    tips: [
      'Describe each class in one sentence without "and" to verify it has a single responsibility',
      'Group methods by the stakeholder or business reason that would cause them to change',
      'SRP does not mean one method per class; it means one cohesive purpose per class',
      'Use the "axis of change" mental model: identify what forces would drive modifications to this class',
      'In interviews, show SRP by separating data access, business logic, and presentation into different classes'
    ],

    sampleQuestions: [
      'Refactor a class that violates SRP into multiple classes',
      'How does SRP apply at the microservice level?',
      'What is the difference between cohesion and SRP?',
      'Can a class with many methods still follow SRP?',
      'How do you balance SRP with the overhead of many small classes?'
    ]
  },
  {
    id: 'ocp',
    title: 'Open/Closed Principle',
    icon: 'compass',
    color: '#10b981',
    questions: 6,
    description: 'Software entities should be open for extension but closed for modification.',

    introduction: `The Open/Closed Principle (OCP) states that software entities (classes, modules, functions) should be open for extension but closed for modification. You should be able to add new behavior to a system without changing the existing, tested code. This is achieved through abstractions: interfaces, abstract classes, and polymorphism.

Consider a payment processing system. If you hard-code "if creditCard then... elif paypal then... elif bitcoin then..." in a single function, adding a new payment method (Apple Pay) requires modifying that function. This risks breaking the existing, tested credit card and PayPal logic. With OCP, you define a PaymentProcessor interface and create separate classes for each payment method. Adding Apple Pay means creating a new ApplePayProcessor class; no existing code is changed.

OCP is the principle behind many design patterns: Strategy (swap algorithms), Template Method (override steps), Decorator (add behavior), and Plugin architectures. It does not mean you never modify existing code; bug fixes and performance improvements require changes. It means new features should be additive, not invasive.`,

    keyQuestions: [
      {
        question: 'How do you achieve OCP in practice?',
        answer: `The primary mechanism is abstraction through interfaces and polymorphism. Define a stable interface that represents the behavior. Create concrete implementations for each variant. New variants are new classes that implement the same interface, requiring no changes to existing code.

Other mechanisms include: the Strategy pattern (inject different algorithm implementations), the Template Method pattern (subclasses override specific steps of an algorithm), the Decorator pattern (wrap existing objects to add behavior), and plugin architectures (load new behavior from external modules at runtime). Configuration and data-driven design also support OCP: a rule engine that reads rules from a database can add new rules without code changes. The key insight is that the extension point must be designed intentionally; code is not automatically open for extension.`
      },
      {
        question: 'What is the relationship between OCP and switch/if-else chains?',
        answer: `A switch statement or if-else chain on a type discriminator is a classic OCP violation. Every time a new type is added, the switch statement must be modified. This is the "modification" that OCP aims to eliminate.

The refactoring is to replace the conditional with polymorphism. Extract each branch into a class that implements a common interface. The switch statement becomes a single polymorphic method call. However, not every conditional violates OCP. Business logic conditionals (if amount > 1000 then requireApproval) are fine. The violation specifically occurs when you branch on type to determine behavior, which is what polymorphism was designed to handle. A factory or registry can map types to implementations, centralizing the "which class to create" logic in one place.`
      },
      {
        question: 'When is it OK to modify existing code?',
        answer: `OCP is a principle for managing new requirements, not an absolute rule. Bug fixes require modifying existing code to correct behavior. Performance optimizations may require changing implementations. Refactoring for clarity changes code without changing behavior. All of these are legitimate modifications.

The principle applies specifically to feature additions. When a new requirement says "support a new payment method" or "handle a new file format," that should be achievable by adding new code rather than editing existing code. If you find that every new feature requires touching many existing files, your design likely violates OCP and needs refactoring to introduce appropriate abstraction points.`
      }
    ],

    tips: [
      'Identify likely extension points in your design and create interfaces there',
      'Replace type-based switch/if-else chains with polymorphism',
      'Use the Strategy pattern for interchangeable algorithms',
      'Do not create extension points preemptively everywhere; only where change is likely',
      'In interviews, demonstrate OCP by showing how to add a new type or behavior without modifying existing classes'
    ],

    sampleQuestions: [
      'Refactor a switch statement on shape type to follow OCP',
      'How do design patterns like Strategy and Decorator support OCP?',
      'What is the role of interfaces in the Open/Closed Principle?',
      'How does a plugin architecture achieve OCP?',
      'When does following OCP introduce too much complexity?'
    ]
  },
  {
    id: 'lsp',
    title: 'Liskov Substitution Principle',
    icon: 'compass',
    color: '#10b981',
    questions: 6,
    description: 'Subtypes must be substitutable for their base types without altering correctness.',

    introduction: `The Liskov Substitution Principle (LSP), formulated by Barbara Liskov, states that objects of a superclass should be replaceable with objects of a subclass without altering the correctness of the program. If function F works correctly with objects of type T, it must also work correctly with objects of any subtype S of T.

The classic violation is the Square-Rectangle problem. A Rectangle has setWidth() and setHeight() that independently change each dimension. A Square IS-A Rectangle mathematically, but if Square.setWidth() also changes the height (to maintain the square invariant), code that expects independent dimensions breaks. The substitute (Square) violates the expectations set by the base type (Rectangle).

LSP ensures that inheritance hierarchies are semantically correct, not just syntactically correct. A subclass can add behavior but must not violate the behavioral contract of the parent. This means: preconditions cannot be strengthened (a subclass cannot require more from callers), postconditions cannot be weakened (a subclass cannot deliver less), and invariants of the parent must be preserved.`,

    keyQuestions: [
      {
        question: 'What is the Square-Rectangle problem and why does it violate LSP?',
        answer: `A Rectangle class has setWidth(w) and setHeight(h) methods that independently change each dimension. A Square class inherits from Rectangle. Since a square's sides must be equal, Square.setWidth(w) sets both width and height to w, and setHeight(h) sets both to h.

Now consider code that takes a Rectangle r, calls r.setWidth(5) and r.setHeight(10), then asserts r.area() == 50. With a true Rectangle, this passes. With a Square, r.setHeight(10) also sets width to 10, so r.area() == 100. The Square subtype violates the Rectangle's contract that width and height are independent. The solution is to not make Square extend Rectangle. Instead, both can implement a Shape interface with an area() method, without inheriting setWidth/setHeight behavior.`
      },
      {
        question: 'What are the formal rules of LSP?',
        answer: `LSP has three formal behavioral rules:

Precondition rule: A subclass method cannot require MORE than the parent. If the parent's withdraw() accepts any positive amount, the subclass cannot restrict it to amounts under 1000. Callers who relied on the parent's broader contract would break.

Postcondition rule: A subclass method cannot deliver LESS than the parent. If the parent's find() guarantees returning a non-null result when the item exists, the subclass cannot return null in that case. Callers who relied on the guarantee would break.

Invariant rule: A subclass must maintain all invariants of the parent. If the parent guarantees balance >= 0, the subclass must also maintain this. Additionally, the history rule states that a subclass should not introduce methods that put the object in states the parent could not be in.`
      },
      {
        question: 'How do you test for LSP violations?',
        answer: `Write behavioral tests against the base class contract and run them with every subclass instance. If a test expects rectangle.setWidth(5); rectangle.setHeight(10); assert(rectangle.area() == 50), it should pass for every class that extends Rectangle. Any subclass that fails this test violates LSP.

In practice, look for these code smells: subclass methods that throw UnsupportedOperationException (e.g., a ReadOnlyList that throws on add()), subclass methods that silently ignore calls (a NullLogger that does nothing), and subclass methods that add preconditions the parent did not have. Also check for type-checking in client code: if (animal instanceof Dog) suggests that the client does not trust the Animal contract, which often indicates an LSP violation somewhere in the hierarchy.`
      }
    ],

    tips: [
      'Test subclasses against the parent class\'s behavioral tests, not just the subclass\'s own tests',
      'If a subclass needs to throw UnsupportedOperationException for a parent method, the hierarchy is wrong',
      'Use "is behaviorally substitutable for" instead of "is-a" to validate inheritance',
      'When LSP is violated, prefer composition or separate interfaces over forcing an inheritance relationship',
      'In interviews, mention the Square-Rectangle problem as the canonical example and propose the correct design'
    ],

    sampleQuestions: [
      'Explain the Square-Rectangle problem and how to fix it',
      'How do preconditions and postconditions relate to LSP?',
      'Give an example of an LSP violation in a real codebase',
      'How does LSP influence how you design class hierarchies?',
      'What is the relationship between LSP and the throws UnsupportedOperationException antipattern?'
    ]
  },
  {
    id: 'isp',
    title: 'Interface Segregation Principle',
    icon: 'compass',
    color: '#10b981',
    questions: 5,
    description: 'Clients should not be forced to depend on interfaces they do not use.',

    introduction: `The Interface Segregation Principle (ISP) states that no client should be forced to depend on methods it does not use. Fat interfaces that bundle many methods force implementing classes to provide stubs or throw exceptions for methods they do not support. ISP says to break these fat interfaces into smaller, more specific ones so that clients only depend on the methods they actually need.

Consider a Worker interface with work(), eat(), and sleep() methods. A HumanWorker implements all three sensibly. But a RobotWorker does not eat or sleep. If forced to implement the fat Worker interface, RobotWorker must provide empty or exception-throwing implementations of eat() and sleep(). This pollutes the interface and confuses callers. ISP says to split into Workable, Eatable, and Sleepable interfaces. HumanWorker implements all three; RobotWorker implements only Workable.

ISP is closely related to SRP applied at the interface level. Just as a class should have one reason to change, an interface should serve one type of client. When an interface serves multiple different clients with different needs, it should be split so that each client depends only on what it uses.`,

    keyQuestions: [
      {
        question: 'How do you identify fat interfaces that need splitting?',
        answer: `Look for these signals: implementing classes that leave methods unimplemented or throw UnsupportedOperationException; interfaces with methods that are only used by some clients while other clients ignore them; interfaces that grow over time as new features are added without considering whether all implementors need the new methods.

Count the methods in your interface and ask: "Does every implementor use every method?" If not, the interface should be split. Another technique is to look at clients: if different clients import the same interface but use different subsets of its methods, the interface is serving multiple roles and should be segregated. IDEs can help by showing which methods of an interface are unused in specific implementing classes.`
      },
      {
        question: 'How does ISP interact with the other SOLID principles?',
        answer: `ISP and SRP are complementary: SRP ensures classes have one responsibility, ISP ensures interfaces have one responsibility. A fat interface violating ISP often indicates that the classes behind it violate SRP.

ISP supports LSP: when interfaces are small and focused, implementing classes are less likely to need stubs or exceptions that violate substitutability. ISP enables OCP: small interfaces make it easier to add new implementations without modifying existing code. ISP supports DIP: high-level modules can depend on small, specific interfaces rather than large, monolithic ones. Together, the SOLID principles create a reinforcing system where following one principle makes it easier to follow the others.`
      },
      {
        question: 'How do you apply ISP in languages without explicit interfaces like Python?',
        answer: `In Python, ISP is applied through abstract base classes (ABCs) with @abstractmethod, protocols (typing.Protocol for structural subtyping), or simply by convention with duck typing. Even without formal interfaces, you can design small, focused ABCs.

Instead of one large WorkerABC with work(), eat(), and sleep() abstract methods, create WorkableABC, EatableABC, and SleepableABC. Python's multiple inheritance makes this natural: class HumanWorker(WorkableABC, EatableABC, SleepableABC). With Protocol (Python 3.8+), you can define structural interfaces: class Workable(Protocol): def work(self) -> None: ... Any class with a work() method satisfies this protocol without explicit inheritance. This brings ISP benefits to duck-typed codebases.`
      }
    ],

    tips: [
      'Prefer many small, focused interfaces over one large interface',
      'If an implementor has to throw UnsupportedOperationException, the interface is too broad',
      'Design interfaces from the client perspective: what does each client need?',
      'In Java, a class can implement multiple interfaces, making ISP easy to apply',
      'Use role interfaces (Printable, Serializable, Cacheable) rather than header interfaces (IUser, IOrder)'
    ],

    sampleQuestions: [
      'Refactor a fat interface into smaller role-based interfaces',
      'How does ISP prevent the UnsupportedOperationException antipattern?',
      'What is the difference between a role interface and a header interface?',
      'How would you apply ISP in a REST API design?',
      'When might having too many small interfaces become a problem?'
    ]
  },
  {
    id: 'dip',
    title: 'Dependency Inversion Principle',
    icon: 'compass',
    color: '#10b981',
    questions: 6,
    description: 'High-level modules should not depend on low-level modules; both should depend on abstractions.',

    introduction: `The Dependency Inversion Principle (DIP) states two things: high-level modules should not depend on low-level modules, and both should depend on abstractions. Additionally, abstractions should not depend on details; details should depend on abstractions. This inverts the traditional dependency direction where high-level business logic directly calls low-level infrastructure code.

Without DIP, a UserService class directly instantiates and calls MySQLUserRepository. The business logic (UserService) depends on the infrastructure detail (MySQL). Changing to PostgreSQL requires modifying UserService. With DIP, UserService depends on a UserRepository interface, and MySQLUserRepository implements that interface. The dependency arrow is inverted: both the high-level module and the low-level module depend on the abstraction.

DIP is the architectural foundation for dependency injection (DI) frameworks like Spring, Guice, and .NET's built-in DI container. But DIP is a design principle; DI is a technique for achieving it. You can follow DIP without a framework by simply passing dependencies through constructors. The principle ensures that your business logic is decoupled from infrastructure concerns and can be tested, reused, and evolved independently.`,

    keyQuestions: [
      {
        question: 'What is the difference between Dependency Inversion and Dependency Injection?',
        answer: `Dependency Inversion is a design principle about the direction of dependencies. It says high-level modules should depend on abstractions, not on low-level details. It is about architecture and design.

Dependency Injection is a technique for providing an object's dependencies from the outside rather than having the object create them internally. Instead of UserService creating "new MySQLUserRepository()" internally, it receives a UserRepository through its constructor. DI is one way to achieve DIP, but not the only way. Service locator patterns and plugin architectures also achieve DIP. You can practice DI without DIP (injecting concrete classes) and DIP without DI (using factory methods), but they work best together.`
      },
      {
        question: 'How does DIP enable testability?',
        answer: `When a class depends on an abstraction (interface) rather than a concrete implementation, you can inject a test double (mock, stub, or fake) in tests. A UserService that depends on UserRepository (interface) can be tested with an InMemoryUserRepository that stores data in a HashMap, requiring no database setup.

Without DIP, if UserService directly creates MySQLUserRepository, your unit tests must either spin up a MySQL database (slow, fragile) or use reflection hacks to replace the dependency (ugly, brittle). DIP makes the seam explicit: the constructor declares what it needs, and tests provide lightweight alternatives. This is why "design for testability" and "follow DIP" are essentially the same advice.`
      },
      {
        question: 'How do you implement DIP in different languages?',
        answer: `In Java and C#, define an interface for each dependency boundary. The high-level class takes the interface in its constructor. A DI container (Spring, Guice, .NET DI) wires the concrete implementation at startup. Alternatively, wire manually in a composition root (the main method or an application factory).

In Python, interfaces can be ABCs or Protocols. Dependency injection is typically manual (pass objects through constructors) since Python's dynamic nature makes DI containers less necessary. In Go, interfaces are satisfied implicitly, making DIP natural: a function that takes an io.Reader can receive any type with a Read method. In JavaScript/TypeScript, DIP is achieved through constructor injection with or without containers like InversifyJS. The principle is language-agnostic; only the mechanism varies.`
      }
    ],

    tips: [
      'Depend on interfaces at module boundaries, not on concrete classes',
      'Define interfaces in the high-level module, not in the low-level module; the abstraction belongs to the consumer',
      'Use constructor injection to make dependencies explicit and visible',
      'A DI container is convenient but not required; manual wiring in a composition root is perfectly valid',
      'In interviews, demonstrate DIP by drawing the dependency arrows and showing they point toward abstractions'
    ],

    sampleQuestions: [
      'Refactor a class that directly instantiates its dependencies to follow DIP',
      'What is a composition root and why is it important?',
      'How does DIP relate to hexagonal architecture (ports and adapters)?',
      'Compare dependency injection approaches across Java, Python, and Go',
      'What are the downsides of strict DIP application?'
    ]
  },
  {
    id: 'solid-summary',
    title: 'SOLID Principles Summary',
    icon: 'compass',
    color: '#10b981',
    questions: 8,
    description: 'The five foundational principles of object-oriented design, unified.',

    introduction: `SOLID is an acronym for five design principles introduced by Robert C. Martin that guide developers in creating software that is easy to maintain, extend, and test. They are: Single Responsibility (SRP), Open/Closed (OCP), Liskov Substitution (LSP), Interface Segregation (ISP), and Dependency Inversion (DIP). Together, they form a cohesive philosophy for managing complexity in object-oriented systems.

The principles are not independent rules to follow in isolation; they reinforce each other. SRP keeps classes focused, which makes them easier to extend (OCP). Small, focused interfaces (ISP) make substitution safe (LSP). Depending on abstractions (DIP) enables extension without modification (OCP). When one principle is violated, it often cascades into violations of others.

In interviews, SOLID is one of the most commonly tested topics in LLD rounds. Interviewers expect you to not only define each principle but also apply them to real designs, identify violations, and propose refactorings. Understanding when and where to apply each principle (and when to relax them for simplicity) demonstrates design maturity.`,

    keyQuestions: [
      {
        question: 'How do the SOLID principles work together?',
        answer: `The principles form a reinforcing cycle. SRP produces focused classes with one reason to change. OCP ensures that new features extend these classes rather than modifying them. LSP guarantees that subclasses honor the parent's contract, making polymorphic extension safe. ISP keeps interfaces lean so that implementors are not burdened with unnecessary methods. DIP ensures that high-level business logic does not depend on low-level infrastructure details.

A practical flow: you identify responsibilities (SRP), define interfaces for them (ISP), depend on those interfaces (DIP), extend behavior through new implementations (OCP), and ensure all implementations are substitutable (LSP). Violating one often causes a chain reaction: a fat interface (ISP violation) forces implementors to stub methods (LSP violation), which makes the system fragile to new types (OCP violation).`
      },
      {
        question: 'When should you relax SOLID principles?',
        answer: `SOLID principles are guidelines, not laws. Applying them dogmatically to simple systems creates unnecessary complexity. A one-person project with 500 lines of code does not need interfaces for every class. A prototype or proof of concept should prioritize speed over architecture.

Relax SRP when splitting a class would create two tiny classes that always change together. Relax OCP when the set of types is genuinely fixed and unlikely to grow. Relax ISP when the interface is already small (3-4 methods) and all implementors use all methods. Relax DIP when the low-level module is a stable, well-tested library unlikely to change (e.g., no need to abstract the standard library's String class). The key is to apply SOLID where the cost of rigidity (hard to change, hard to test, hard to extend) exceeds the cost of abstraction (more indirection, more files, more cognitive load).`
      },
      {
        question: 'How do SOLID principles apply to microservices?',
        answer: `Each SOLID principle has a direct analog at the service level. SRP: each service has one bounded context and one team owning it. OCP: new capabilities are added as new services, not by modifying existing ones. LSP: a new version of a service must be backward-compatible with clients of the old version. ISP: service APIs should be tailored to client needs (the Backend for Frontend pattern). DIP: services communicate through contracts (APIs, schemas, events) rather than directly depending on each other's implementations.

The same principles that prevent a class from becoming a monolith prevent a microservice from becoming one. When a single service handles user auth, billing, notifications, and reporting, it violates SRP at the service level and creates the exact maintenance problems SOLID aims to prevent.`
      },
      {
        question: 'How do you explain SOLID principles with a single example?',
        answer: `Consider an e-commerce order system. SRP: OrderCalculator computes totals, OrderRepository saves to the database, OrderNotifier sends confirmation emails. Each has one job. OCP: adding a new discount type (buy-one-get-one) means creating a new DiscountStrategy class, not modifying OrderCalculator. LSP: every DiscountStrategy subclass (PercentDiscount, FlatDiscount, BOGODiscount) correctly returns a discount amount, safely substitutable. ISP: the DiscountStrategy interface has only calculate(order): decimal, not a fat interface with unrelated methods. DIP: OrderCalculator depends on the DiscountStrategy interface, not on PercentDiscount directly, so new strategies can be injected without changing the calculator.

Walk through this example in an interview to demonstrate not just knowledge of the definitions but the ability to apply them cohesively to a real design.`
      }
    ],

    tips: [
      'In interviews, use a single concrete example to demonstrate all five principles working together',
      'SOLID principles are about managing change: each one addresses a different dimension of change',
      'Do not apply SOLID dogmatically; consider the scale and complexity of your system',
      'Start with SRP (the easiest to apply) and let it naturally lead you to the others',
      'Practice identifying SOLID violations in existing code; this is a common interview exercise'
    ],

    sampleQuestions: [
      'Explain all five SOLID principles with a single unified example',
      'Which SOLID principle do you find hardest to apply and why?',
      'Identify SOLID violations in a given class and propose refactorings',
      'How do SOLID principles apply to functional programming?',
      'When does following SOLID principles do more harm than good?'
    ]
  },

  // ─────────────────────────────────────────
  // UML Diagrams
  // ─────────────────────────────────────────
  {
    id: 'class-diagram',
    title: 'Class Diagram',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 7,
    description: 'Visualize the static structure of a system: classes, attributes, methods, and relationships.',

    introduction: `A class diagram is the most commonly used UML diagram, showing the static structure of a system. It depicts classes (with their attributes and methods), interfaces, and the relationships between them: inheritance, implementation, association, aggregation, and composition. In LLD interviews, the class diagram is your primary design artifact.

Each class is drawn as a rectangle divided into three sections: the class name at the top, attributes in the middle, and methods at the bottom. Visibility modifiers are shown with symbols: + for public, - for private, # for protected, and ~ for package-private. Relationships are shown with different line and arrow styles: a solid line with a hollow triangle for inheritance, a dashed line with a hollow triangle for interface implementation, and various diamond shapes for aggregation and composition.

Drawing a clear class diagram during an interview demonstrates your ability to think structurally about a problem before writing code. It communicates your understanding of the domain, the responsibilities of each class, and how they interact. Practice drawing them by hand, as whiteboard interviews rarely have diagramming software.`,

    keyQuestions: [
      {
        question: 'What are the different types of relationships in a class diagram and how are they drawn?',
        answer: `Association: a solid line between two classes, meaning they are related. Can be labeled with the relationship name and multiplicity (1..*, 0..1, etc.). Directed association adds an arrowhead to show navigation direction.

Aggregation: a solid line with a hollow (empty) diamond at the "whole" end. Represents "has-a" where the part exists independently. Department <>---- Employee.

Composition: a solid line with a filled (solid) diamond at the "whole" end. Represents "owns-a" where the part's lifecycle is tied to the whole. House <*>---- Room.

Inheritance: a solid line with a hollow triangle at the parent end. Dog ---|> Animal.

Implementation: a dashed line with a hollow triangle at the interface end. ArrayList ---|> List.

Dependency: a dashed line with an open arrow. Class A uses Class B temporarily (as a method parameter, for instance). A - - -> B.`
      },
      {
        question: 'How do you translate a class diagram into code?',
        answer: `Each class rectangle becomes a class definition. Attributes become fields with the specified types and visibility. Methods become method definitions with the specified signatures. Inheritance arrows become "extends" (Java) or "class Child(Parent)" (Python). Implementation arrows become "implements" (Java) or inheriting from an ABC (Python).

Associations become field references. A one-to-one association means a field of the other class's type. A one-to-many association means a collection field (List, Set). Aggregation is implemented by receiving objects through the constructor. Composition is implemented by creating objects inside the constructor. Multiplicity determines whether to use a single reference or a collection. In interviews, draw the diagram first, then translate to code; this prevents missing relationships.`
      },
      {
        question: 'What should you include vs exclude in a class diagram during an interview?',
        answer: `Include: the main domain entities and their key attributes and methods, all relationships between classes (inheritance, composition, association), interfaces that define behavioral contracts, and key design patterns (mark them with stereotypes like <<Strategy>> or <<Singleton>>).

Exclude: getter/setter methods (they clutter the diagram), utility classes and helpers (unless they are architecturally significant), implementation details like private helper methods, and standard library classes (do not draw String, List, etc.). The diagram should tell a story about the design at a glance. If someone cannot understand the system's structure in 30 seconds of looking at the diagram, it has too much detail. Focus on the architectural decisions: what the classes are, how they relate, and what patterns organize them.`
      }
    ],

    tips: [
      'Start by identifying nouns in the requirements as candidate classes',
      'Draw relationships before adding methods; the structure is more important than individual operations',
      'Use stereotypes (<<interface>>, <<abstract>>, <<enum>>) to clarify element types',
      'Show multiplicity on all associations (1, 0..1, 1..*, *)',
      'Practice drawing class diagrams by hand for interview whiteboard settings'
    ],

    sampleQuestions: [
      'Draw a class diagram for a library management system',
      'What is the difference between an aggregation and composition in UML notation?',
      'How do you represent abstract classes and interfaces in a class diagram?',
      'Translate a given class diagram into Java or Python code',
      'What UML notations would you use to show the Strategy pattern?'
    ]
  },
  {
    id: 'use-case-diagram',
    title: 'Use Case Diagram',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 5,
    description: 'Capture functional requirements by showing actors and their interactions with the system.',

    introduction: `A use case diagram captures the functional requirements of a system from the user's perspective. It shows actors (users or external systems that interact with the system) and use cases (the functionalities the system provides). The diagram answers the question: who uses the system and what can they do with it?

Actors are drawn as stick figures and placed outside the system boundary (a rectangle). Use cases are drawn as ovals inside the system boundary. Lines connect actors to the use cases they participate in. Relationships between use cases include "include" (a use case always includes another) and "extend" (a use case optionally extends another under certain conditions).

Use case diagrams are valuable in the early stages of design to ensure you understand the requirements before diving into implementation details. In interviews, they help you structure your thinking when asked "Design an ATM system" or "Design an online bookstore." Starting with a use case diagram shows the interviewer that you think about who the users are and what they need before deciding how to build it.`,

    keyQuestions: [
      {
        question: 'What is the difference between include and extend relationships?',
        answer: `An "include" relationship means the base use case always incorporates the behavior of the included use case. It represents mandatory, reusable behavior. For example, "Place Order" includes "Authenticate User" because every order placement requires authentication. The included behavior is not optional.

An "extend" relationship means the extending use case optionally adds behavior to the base use case under certain conditions (called extension points). For example, "Place Order" is extended by "Apply Coupon Code" because a coupon is optional. The base use case works perfectly without the extension. A helpful way to remember: include is "always happens," extend is "sometimes happens." In UML, include is drawn with a dashed arrow labeled <<include>> pointing from the base to the included use case, and extend is drawn with a dashed arrow labeled <<extend>> pointing from the extending use case to the base.`
      },
      {
        question: 'How do you identify actors in a system?',
        answer: `Actors are entities outside the system boundary that interact with the system. They can be human users (Customer, Admin, Manager), external systems (Payment Gateway, Email Service), or hardware devices (Barcode Scanner, Sensor). The key criterion is that they initiate or participate in use cases but are not part of the system being designed.

To identify actors, ask: who uses this system? Who provides data to it? Who receives output from it? What other systems does it integrate with? Actors can have generalization relationships: a PremiumCustomer is a specialization of Customer and inherits all of Customer's use cases while adding new ones. In interviews, start by listing all actors before identifying use cases; this ensures you consider all perspectives and do not miss requirements.`
      },
      {
        question: 'How detailed should a use case diagram be?',
        answer: `A use case diagram should capture the major functionalities at a high level. It should not include every minor operation. For an e-commerce system, "Place Order," "Track Shipment," "Manage Inventory," and "Process Payment" are appropriate use cases. "Click Add to Cart Button" is too granular.

In interviews, aim for 8-15 use cases that cover the main functionality. Group related use cases visually. Use include and extend sparingly; if every use case is connected to every other, the diagram is too complex. The purpose is to provide a clear, at-a-glance view of what the system does and for whom. If you need more detail on a specific use case, write a use case description (preconditions, main flow, alternate flows, postconditions) as a companion artifact.`
      }
    ],

    tips: [
      'Place the system boundary rectangle first, then identify actors outside it',
      'Use include for mandatory shared behavior and extend for optional behavior',
      'Keep use case names as verb-noun phrases: "Place Order", "Generate Report"',
      'Do not confuse use cases with steps in a process; each use case should deliver a complete outcome to an actor',
      'In interviews, use case diagrams are a great starting point before drawing class or sequence diagrams'
    ],

    sampleQuestions: [
      'Draw a use case diagram for an ATM system',
      'What is the difference between include and extend in use case diagrams?',
      'How do you identify actors for an online food delivery system?',
      'When would you use a use case diagram vs a user story?',
      'How do you handle actor generalization in use case diagrams?'
    ]
  },
  {
    id: 'sequence-diagram',
    title: 'Sequence Diagram',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 6,
    description: 'Model the dynamic interaction between objects over time.',

    introduction: `A sequence diagram shows how objects interact with each other over time. Unlike a class diagram (static structure), a sequence diagram captures the dynamic behavior of a specific scenario or use case. It shows which objects send messages to which other objects and in what order. Time flows from top to bottom.

Each object or participant is drawn as a rectangle at the top with a dashed vertical line (lifeline) extending downward. Messages between objects are drawn as horizontal arrows between lifelines. Synchronous calls are solid arrows; asynchronous calls are open arrows. Return messages are dashed arrows going back. Activation bars (thin rectangles on lifelines) show when an object is actively processing.

Sequence diagrams are invaluable for understanding and communicating the flow of complex operations. In interviews, when asked to design a system, a sequence diagram for the main flow (e.g., "user places an order") shows the interviewer that you understand how the components interact at runtime, not just what the components are.`,

    keyQuestions: [
      {
        question: 'What are the key elements of a sequence diagram?',
        answer: `Participants (actors and objects): rectangles at the top with name and optional type (e.g., :OrderService). Lifelines: dashed vertical lines extending down from each participant. Messages: horizontal arrows between lifelines. Solid arrow for synchronous calls, open arrow for asynchronous calls, dashed arrow for return values. Activation bars: thin rectangles on lifelines showing active processing periods.

Combined fragments add control flow: "alt" for if/else (two sections separated by a dashed line), "loop" for iteration with a guard condition, "opt" for optional behavior (like an if without else), and "par" for parallel execution. Self-calls are shown as an arrow from a lifeline back to itself with a nested activation bar. Object creation is shown with a message arrow pointing to a new participant box placed lower than the others.`
      },
      {
        question: 'How do you draw a sequence diagram for a complex operation like order placement?',
        answer: `Start by identifying the participants: User, OrderController, OrderService, InventoryService, PaymentService, NotificationService. Then trace the flow:

1. User sends createOrder(items) to OrderController. 2. OrderController calls validate(items) on OrderService. 3. OrderService calls checkStock(items) on InventoryService. 4. InventoryService returns stockAvailable. 5. OrderService calls processPayment(amount) on PaymentService. 6. PaymentService returns paymentResult. 7. Use an "alt" fragment: if payment succeeded, OrderService calls reserveStock on InventoryService and sendConfirmation on NotificationService; if payment failed, OrderService returns an error. 8. OrderController returns the order response to User.

This sequence shows the happy path and error handling, demonstrates which services talk to each other, and reveals potential bottlenecks or failure points.`
      },
      {
        question: 'When should you use a sequence diagram vs an activity diagram?',
        answer: `Use a sequence diagram when you want to show how specific objects or components interact over time for a particular scenario. It emphasizes the messages between participants and the order of those messages. It answers: "Who talks to whom and when?"

Use an activity diagram when you want to show the flow of a process with decision points, parallel branches, and loops, without focusing on which specific object performs each step. It answers: "What are the steps and decisions in this process?" For interview purposes, sequence diagrams are more common because LLD interviews focus on object interaction. Activity diagrams are more useful for workflow-heavy domains like business processes, CI/CD pipelines, or state-heavy systems.`
      }
    ],

    tips: [
      'Start from the actor on the left and flow messages left to right',
      'Show the happy path first, then add error handling with alt fragments',
      'Keep the number of participants to 5-7 for readability',
      'Use activation bars to show processing duration and identify potential bottlenecks',
      'In interviews, sequence diagrams pair well with class diagrams to show both structure and behavior'
    ],

    sampleQuestions: [
      'Draw a sequence diagram for user authentication with two-factor authentication',
      'How do you represent asynchronous communication in a sequence diagram?',
      'What are combined fragments and when do you use them?',
      'Draw a sequence diagram for the checkout flow in an e-commerce system',
      'How do you show error handling and retries in a sequence diagram?'
    ]
  },
  {
    id: 'activity-diagram',
    title: 'Activity Diagram',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 5,
    description: 'Model workflows and processes with decision points, parallel flows, and loops.',

    introduction: `An activity diagram models the workflow or process flow of a system. It shows activities (actions), decision points, parallel branches, and the sequence in which things happen. Think of it as a sophisticated flowchart that can express concurrency, synchronization, and complex branching logic.

Activity diagrams use specific symbols: rounded rectangles for activities/actions, diamonds for decision/merge nodes, horizontal bars for fork/join (parallel execution), a filled circle for the initial node, and a circle with a ring for the final node. Arrows (transitions) connect these elements to show the flow from start to finish.

Activity diagrams are particularly useful for modeling business processes, algorithms with complex branching, and workflows that involve parallelism. In a food delivery system, an activity diagram might show how an order flows from placement through restaurant preparation and driver assignment (happening in parallel) to delivery and completion. They complement sequence diagrams by showing "what happens" rather than "who does what."`,

    keyQuestions: [
      {
        question: 'What are the key symbols in an activity diagram?',
        answer: `Initial node: a filled black circle, representing the start of the workflow. Final node: a filled circle inside a ring, representing the end. Activity/Action: a rounded rectangle with the action name (e.g., "Validate Order"). Decision node: a diamond with one incoming flow and multiple outgoing flows, each labeled with a guard condition (e.g., [valid], [invalid]). Merge node: a diamond with multiple incoming flows and one outgoing flow.

Fork: a horizontal bar with one incoming flow and multiple outgoing flows, representing the start of parallel execution. Join: a horizontal bar with multiple incoming flows and one outgoing flow, representing synchronization of parallel paths. Swimlanes: vertical or horizontal partitions that assign activities to specific actors or components (e.g., Customer lane, System lane, Kitchen lane). Object nodes: rectangles representing data flowing between activities.`
      },
      {
        question: 'How do you model parallel execution in an activity diagram?',
        answer: `Use a fork bar to split the flow into parallel paths and a join bar to synchronize them. For an order processing example: after "Accept Order", a fork splits into two parallel paths: "Prepare Food" (restaurant lane) and "Assign Driver" (dispatch lane). Both must complete before the flow continues through a join bar to "Hand Off to Driver."

The semantics are important: all paths leaving a fork execute concurrently, and the join waits for ALL paths to complete before proceeding. This is different from a decision node, where only ONE path is taken based on a condition. Interviewers often test this distinction. You can also show timed events using an hourglass symbol (e.g., "Wait 30 minutes") and signals using send/receive event symbols to model asynchronous communication between swimlanes.`
      },
      {
        question: 'When should you use an activity diagram in an interview?',
        answer: `Use an activity diagram when the problem involves a complex workflow with multiple decision points and possible parallel execution. Examples: order lifecycle in an e-commerce system, claim processing in insurance, CI/CD pipeline flow, user registration with email verification, or payment processing with retry logic.

Activity diagrams are less useful for problems centered on data structures (use class diagrams) or object interaction patterns (use sequence diagrams). In an interview, if the question is "walk me through what happens when a user places an order," an activity diagram showing the end-to-end flow is powerful. If the question is "how do OrderService and PaymentService interact," a sequence diagram is better. Choose the diagram that best answers the specific question.`
      }
    ],

    tips: [
      'Use swimlanes to assign activities to responsible actors or components',
      'Keep decision nodes binary (yes/no) when possible for clarity',
      'Use fork/join bars to explicitly show parallelism and synchronization points',
      'Label all transitions from decision nodes with guard conditions',
      'Activity diagrams work well for modeling error handling and retry flows'
    ],

    sampleQuestions: [
      'Draw an activity diagram for a food delivery order lifecycle',
      'How do you model parallel execution and synchronization?',
      'What is the difference between a decision node and a fork node?',
      'When would you choose an activity diagram over a sequence diagram?',
      'Draw an activity diagram for a user registration flow with email verification'
    ]
  },
  {
    id: 'state-diagram',
    title: 'State Machine Diagram',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 6,
    description: 'Model the states of an object and the events that trigger transitions between them.',

    introduction: `A state machine diagram (also called a statechart diagram) models the different states an object can be in and the events or conditions that cause transitions between those states. It answers the question: "What are the possible states of this entity and what triggers changes?"

States are drawn as rounded rectangles with the state name. Transitions are arrows between states labeled with the triggering event, an optional guard condition in brackets, and an optional action. The initial state is shown as a filled circle with an arrow to the first state. The final state is a filled circle inside a ring. States can have internal activities: entry actions (performed on entering the state), exit actions (performed on leaving), and do activities (performed while in the state).

State diagrams are essential for modeling entities with complex lifecycles. An order can be Placed, Confirmed, Preparing, ReadyForPickup, InTransit, Delivered, or Cancelled. An elevator can be Idle, MovingUp, MovingDown, or DoorOpen. Understanding and drawing these state machines is a critical LLD interview skill, especially for problems involving workflows, protocols, or embedded systems.`,

    keyQuestions: [
      {
        question: 'What are the components of a state machine diagram?',
        answer: `States: rounded rectangles representing the current condition of the object. Each state can have entry/exit/do actions. Initial pseudo-state: a filled circle showing where the state machine starts. Final state: a filled circle inside a ring showing termination. Transitions: arrows between states with the format "event [guard] / action".

Composite states: a state that contains sub-states. For example, a "Processing" state might contain sub-states "Validating", "Charging", and "Fulfilling." This allows hierarchical decomposition. History pseudo-state: a circle with "H" that remembers the last active sub-state so the machine can resume where it left off. Choice pseudo-state: a diamond that routes to different states based on conditions, similar to a decision node in activity diagrams.`
      },
      {
        question: 'How do you design a state machine for an order management system?',
        answer: `Identify the states: Created, PaymentPending, PaymentFailed, Confirmed, Preparing, ReadyForPickup, InTransit, Delivered, Cancelled, Refunded. Then identify the transitions:

Created -> PaymentPending: submitOrder(). PaymentPending -> Confirmed: paymentSucceeded(). PaymentPending -> PaymentFailed: paymentDeclined(). PaymentFailed -> PaymentPending: retryPayment(). Confirmed -> Preparing: restaurantAccepts(). Preparing -> ReadyForPickup: foodReady(). ReadyForPickup -> InTransit: driverPickedUp(). InTransit -> Delivered: driverDelivered(). Any state before Preparing -> Cancelled: cancel() [guard: cancellationAllowed]. Delivered -> Refunded: processRefund().

Key design decisions: Can an order be cancelled from any state? What happens on payment retry? Are there timeouts? These transitions define the business rules and must be validated with stakeholders.`
      },
      {
        question: 'What is the difference between a Mealy machine and a Moore machine?',
        answer: `In a Moore machine, outputs (actions) depend only on the current state. Entry and do actions are Moore-style: they execute based on being in a particular state, regardless of how you got there. Every time you enter the "Alarm" state, the alarm sounds.

In a Mealy machine, outputs depend on both the current state AND the triggering event. Transition actions are Mealy-style: the action on a transition from StateA to StateB via EventX might differ from the action on a transition from StateA to StateB via EventY. UML state machines support both: state entry/exit/do actions are Moore-style, and transition actions are Mealy-style. In practice, most real systems use a combination of both.`
      }
    ],

    tips: [
      'Identify all possible states first, then determine valid transitions between them',
      'Every state should be reachable from the initial state and should lead toward the final state (no dead-end states)',
      'Use guard conditions to express business rules that control when transitions are allowed',
      'Composite states help manage complexity for objects with many sub-states',
      'State machines map directly to code using the State pattern or switch-based state machines'
    ],

    sampleQuestions: [
      'Draw a state machine diagram for an elevator system',
      'How do you implement a state machine in code?',
      'What are composite states and when do you use them?',
      'Design a state machine for a vending machine',
      'How do state diagrams help in testing?'
    ]
  },

  // ─────────────────────────────────────────
  // Creational Patterns
  // ─────────────────────────────────────────
  {
    id: 'singleton',
    title: 'Singleton Pattern',
    icon: 'puzzle',
    color: '#f59e0b',
    questions: 6,
    description: 'Ensure a class has only one instance and provide a global point of access to it.',

    introduction: `The Singleton pattern restricts a class to a single instance and provides a global access point to that instance. It is used when exactly one object is needed to coordinate actions across the system, such as a configuration manager, a connection pool, or a logging service. The pattern ensures that no matter how many times you request the instance, you always get the same one.

Implementation involves making the constructor private (so external code cannot call "new"), storing the single instance as a static field, and providing a static getInstance() method that creates the instance on first call and returns the existing instance on subsequent calls. The tricky part is thread safety: in a multi-threaded environment, two threads could simultaneously find the instance is null and both create one.

Singleton is the most commonly known design pattern and also the most controversial. Critics argue it introduces global state (making testing hard), hides dependencies (classes secretly depend on the singleton), and violates SRP (the class manages its own lifecycle in addition to its primary responsibility). In modern development, dependency injection has largely replaced singleton usage by managing object lifecycles externally. In interviews, demonstrate knowledge of both the pattern and its drawbacks.`,

    keyQuestions: [
      {
        question: 'How do you implement a thread-safe Singleton?',
        answer: `Several approaches exist. Eager initialization: create the instance at class loading time as a static final field. It is thread-safe because class loading is synchronized, but wastes resources if the instance is never used.

Lazy initialization with double-checked locking: check if the instance is null, synchronize, check again, then create. The field must be volatile in Java to prevent instruction reordering. This is efficient but complex.

Bill Pugh approach (Java): use a static inner helper class. The inner class is loaded only when getInstance() is first called, and class loading guarantees thread safety. This is the recommended Java approach.

In Python, the __new__ method can check if an instance exists. Alternatively, use a module-level instance since Python modules are singletons by nature. In modern systems, let the DI container manage singleton scope rather than implementing the pattern yourself.`
      },
      {
        question: 'What are the drawbacks of the Singleton pattern?',
        answer: `Global state: the singleton is effectively a global variable, making it hard to reason about which code modifies it and when. Hidden dependencies: classes that use the singleton do not declare it as a dependency, making the dependency graph invisible.

Testing difficulty: you cannot easily replace a singleton with a mock. Since tests share the single instance, one test's modifications affect another. Concurrency risks: if the singleton holds mutable state, concurrent access requires synchronization. Violation of SRP: the class manages its own lifecycle (instance creation, uniqueness enforcement) in addition to its actual responsibility. Tight coupling: code throughout the system depends on the concrete singleton class, making it hard to swap implementations.`
      },
      {
        question: 'When is the Singleton pattern genuinely appropriate?',
        answer: `Singleton is appropriate when there is a natural, domain-driven reason for exactly one instance. A hardware driver interface (one serial port connection), a print spooler coordinating access to a single printer, or a thread pool managing system resources are legitimate use cases.

It is also acceptable as a performance optimization when creating the object is extremely expensive (loading a large configuration file) and the data is immutable after initialization. In these cases, the singleton serves as a cached, read-only resource. If you find yourself needing "singleton" primarily for convenient global access rather than for enforcing uniqueness, you should use dependency injection instead.`
      }
    ],

    codeExample: `# Python — Thread-safe Singleton with metaclass
import threading

class SingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        with cls._lock:
            if cls not in cls._instances:
                instance = super().__call__(*args, **kwargs)
                cls._instances[cls] = instance
        return cls._instances[cls]

class DatabaseConnection(metaclass=SingletonMeta):
    def __init__(self):
        self.connection = self._connect()

    def _connect(self):
        print("Creating database connection...")
        return {"host": "localhost", "port": 5432}

# Usage — always returns the same instance
db1 = DatabaseConnection()
db2 = DatabaseConnection()
assert db1 is db2  # True — same object

# Java — Bill Pugh Singleton (recommended)
# public class Logger {
#     private Logger() {}
#     private static class Holder {
#         static final Logger INSTANCE = new Logger();
#     }
#     public static Logger getInstance() {
#         return Holder.INSTANCE;
#     }
# }`,

    tips: [
      'Prefer DI container singleton scope over implementing the Singleton pattern manually',
      'If you must implement Singleton, use the Bill Pugh idiom (Java) or module-level instance (Python)',
      'Make the singleton immutable if possible to avoid concurrency issues',
      'In interviews, always mention the drawbacks alongside the implementation',
      'Consider whether you truly need global uniqueness or just convenient access (the latter does not require Singleton)'
    ],

    sampleQuestions: [
      'Implement a thread-safe Singleton in Java and Python',
      'What problems does the Singleton pattern cause for unit testing?',
      'How would you refactor a Singleton to use dependency injection instead?',
      'Explain the double-checked locking pattern and why volatile is needed',
      'When is Singleton the right choice vs when is it a code smell?'
    ]
  },
  {
    id: 'factory-method',
    title: 'Factory Method Pattern',
    icon: 'puzzle',
    color: '#f59e0b',
    questions: 6,
    description: 'Define an interface for creating objects, letting subclasses decide which class to instantiate.',

    introduction: `The Factory Method pattern defines an interface for creating an object but lets subclasses decide which concrete class to instantiate. Instead of calling a constructor directly, you call a factory method that returns an object of the desired type. The calling code works with the product interface, not the concrete class.

Consider a logistics application. A Logistics class has a createTransport() method that returns a Transport object. RoadLogistics overrides createTransport() to return a Truck, while SeaLogistics overrides it to return a Ship. The rest of the Logistics code calls transport.deliver() without knowing or caring whether it is a truck or a ship. Adding air transport means creating AirLogistics with createTransport() returning a Plane, with zero changes to existing code.

Factory Method embodies the Open/Closed Principle: you can add new product types without modifying existing factory code. It also supports Dependency Inversion: the high-level code depends on the Transport abstraction, not on Truck or Ship. In interviews, Factory Method is one of the most commonly asked patterns because it demonstrates understanding of polymorphism, abstraction, and extensible design.`,

    keyQuestions: [
      {
        question: 'What is the difference between Factory Method and Simple Factory?',
        answer: `A Simple Factory (not a GoF pattern, but widely used) is a single class with a method that takes a parameter and returns different product types based on that parameter: createShape("circle") returns Circle, createShape("square") returns Square. It centralizes creation but requires modifying the factory method to add new types, violating OCP.

Factory Method moves the creation decision to subclasses. Instead of one factory with a switch statement, you have a factory hierarchy parallel to the product hierarchy. Each factory subclass knows how to create its specific product. Adding a new product means adding a new factory subclass, not modifying existing code. The trade-off is more classes but better adherence to OCP and SRP.`
      },
      {
        question: 'When should you use Factory Method?',
        answer: `Use Factory Method when: the exact type of object to create is not known until runtime; a class wants its subclasses to specify the objects it creates; the creation logic is complex enough to warrant encapsulation (multiple steps, configuration, validation); or you want to decouple the client from concrete product classes.

Real-world examples: GUI frameworks use factory methods to create platform-specific widgets (WindowsButton, MacButton). Database drivers use factory methods to create connections for different databases. Document processing systems use factory methods to create parsers for different file formats. In all cases, the pattern separates "what to create" from "how to use it."`
      },
      {
        question: 'How does Factory Method relate to other creational patterns?',
        answer: `Factory Method is a single-method pattern focused on creating one product type through inheritance. Abstract Factory groups multiple factory methods to create families of related products. Builder creates complex objects step by step. Prototype creates objects by cloning existing ones.

Factory Method can be a building block for Abstract Factory: each method in an Abstract Factory is essentially a Factory Method. You might start with Factory Method for simple cases and evolve to Abstract Factory when you need to create related object families. Factory Method is also related to Template Method: the creator class defines a template for an algorithm that calls the factory method at a specific step, and subclasses override the factory method to customize the product.`
      }
    ],

    codeExample: `# Python — Factory Method for notification system
from abc import ABC, abstractmethod

class Notification(ABC):
    @abstractmethod
    def send(self, message: str) -> str:
        pass

class EmailNotification(Notification):
    def send(self, message: str) -> str:
        return f"Email sent: {message}"

class SMSNotification(Notification):
    def send(self, message: str) -> str:
        return f"SMS sent: {message}"

class PushNotification(Notification):
    def send(self, message: str) -> str:
        return f"Push sent: {message}"

class NotificationFactory(ABC):
    @abstractmethod
    def create_notification(self) -> Notification:
        pass

    def notify(self, message: str) -> str:
        notification = self.create_notification()
        return notification.send(message)

class EmailFactory(NotificationFactory):
    def create_notification(self) -> Notification:
        return EmailNotification()

class SMSFactory(NotificationFactory):
    def create_notification(self) -> Notification:
        return SMSNotification()

# Usage — client code works with factory abstraction
def send_alert(factory: NotificationFactory, msg: str):
    return factory.notify(msg)

print(send_alert(EmailFactory(), "Server down!"))
print(send_alert(SMSFactory(), "Server down!"))`,

    tips: [
      'Use Factory Method when the creation logic should vary by subclass, not when you just want a convenience wrapper around a constructor',
      'The factory method should return an interface or abstract type, never a concrete type',
      'Name factory methods clearly: createTransport(), makeWidget(), newConnection()',
      'Factory Method is often the first step toward Abstract Factory when you discover you need families of products',
      'In interviews, draw the parallel hierarchies: Creator -> ConcreteCreator and Product -> ConcreteProduct'
    ],

    sampleQuestions: [
      'Implement a Factory Method for creating different notification types (email, SMS, push)',
      'What is the difference between Factory Method and Abstract Factory?',
      'How does Factory Method support the Open/Closed Principle?',
      'When would a Simple Factory be sufficient instead of Factory Method?',
      'Draw a class diagram showing the Factory Method pattern structure'
    ]
  },
  {
    id: 'abstract-factory',
    title: 'Abstract Factory Pattern',
    icon: 'puzzle',
    color: '#f59e0b',
    questions: 6,
    description: 'Create families of related objects without specifying their concrete classes.',

    introduction: `The Abstract Factory pattern provides an interface for creating families of related or dependent objects without specifying their concrete classes. While Factory Method creates a single product, Abstract Factory creates an entire suite of related products that are designed to work together.

Imagine building a cross-platform UI toolkit. Each platform (Windows, macOS, Linux) needs its own set of widgets: buttons, text fields, checkboxes, and scroll bars. These widgets must be consistent within a platform (you should not mix a Windows button with a macOS text field). An Abstract Factory defines methods like createButton(), createTextField(), and createCheckbox(). WindowsFactory produces WindowsButton, WindowsTextField, and WindowsCheckbox. MacFactory produces MacButton, MacTextField, and MacCheckbox. The application code uses the factory interface and gets a consistent set of platform-specific widgets without knowing which platform it is running on.

Abstract Factory enforces consistency within a product family. If your system needs to work with sets of objects that must be compatible (database dialects, UI themes, protocol versions), Abstract Factory ensures you never accidentally mix incompatible objects from different families.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Abstract Factory pattern?',
        answer: `The pattern has four roles. AbstractFactory: an interface declaring creation methods for each product type (createButton, createCheckbox). ConcreteFactory: implements the abstract factory for a specific family (WindowsFactory, MacFactory). AbstractProduct: interfaces for each product type (Button, Checkbox). ConcreteProduct: specific implementations of products (WindowsButton, MacCheckbox).

The client code receives a factory (typically through dependency injection or configuration) and calls its creation methods. It works entirely with abstract interfaces: AbstractFactory for creation and AbstractProduct for usage. This means the client is completely decoupled from any concrete family, and switching families requires changing only the factory that is injected.`
      },
      {
        question: 'When is Abstract Factory preferred over Factory Method?',
        answer: `Use Abstract Factory when you need to create groups of related objects that must be used together. Factory Method creates one product; Abstract Factory creates a coordinated family. If you only need to create buttons, Factory Method suffices. If you need buttons, text fields, and checkboxes that must all match the same theme or platform, use Abstract Factory.

Another signal is when your code has multiple Factory Methods that need to be coordinated. If WindowsButtonFactory, WindowsTextFieldFactory, and WindowsCheckboxFactory always need to be used together, consolidate them into a WindowsWidgetFactory (Abstract Factory). The pattern also shines when families are determined at configuration time (e.g., database dialect selection at startup) and the rest of the code should not care which family is active.`
      },
      {
        question: 'What are the drawbacks of Abstract Factory?',
        answer: `Adding a new product type to the family requires modifying the AbstractFactory interface and every ConcreteFactory implementation. If you add a createSlider() method, every factory (WindowsFactory, MacFactory, LinuxFactory) must implement it. This violates OCP for adding new product types (though it supports OCP for adding new families).

The pattern can also lead to a proliferation of classes. Each family times each product type creates a concrete class: 3 families with 5 product types means 15 concrete product classes plus 3 factory classes. For small systems, this overhead may not be justified. A common mitigation is to combine Abstract Factory with Prototype: instead of one class per product, store prototype instances in the factory and clone them.`
      }
    ],

    tips: [
      'Use Abstract Factory when you need to enforce consistency across a family of related objects',
      'Inject the concrete factory through configuration or dependency injection; never hard-code the choice',
      'Abstract Factory enforces OCP for adding new families but not for adding new product types to existing families',
      'Consider combining with Prototype if the number of concrete product classes becomes unwieldy',
      'In interviews, the cross-platform UI toolkit is the canonical example; have it ready'
    ],

    sampleQuestions: [
      'Design an Abstract Factory for a cross-platform UI framework',
      'What happens when you need to add a new product type to an existing Abstract Factory?',
      'Compare Abstract Factory with Factory Method using a concrete example',
      'How does Abstract Factory enforce product family consistency?',
      'Implement an Abstract Factory for database access supporting MySQL, PostgreSQL, and SQLite'
    ]
  },
  {
    id: 'builder',
    title: 'Builder Pattern',
    icon: 'puzzle',
    color: '#f59e0b',
    questions: 6,
    description: 'Construct complex objects step by step, separating construction from representation.',

    introduction: `The Builder pattern separates the construction of a complex object from its representation, allowing the same construction process to create different representations. It is useful when an object requires many parameters, some of which are optional, and constructing it in a single step would be unwieldy.

Consider creating a Pizza object. It needs a size, crust type, sauce, cheese, and any number of optional toppings. A constructor with all these parameters is hard to read: Pizza("large", "thin", "marinara", "mozzarella", true, false, true, true, false). What do those booleans mean? A Builder makes this readable: Pizza.builder().size("large").crust("thin").sauce("marinara").cheese("mozzarella").addTopping("mushrooms").addTopping("olives").build().

The Builder pattern also enforces construction rules. The builder's build() method can validate that all required fields are set and that the combination of options is valid. In the GoF version, a Director class defines the construction sequence, and different Builder implementations produce different representations (Pizza vs CalzoneBuilder). In the modern fluent builder version (popularized by Joshua Bloch), the builder is a static inner class that provides a chainable API.`,

    keyQuestions: [
      {
        question: 'What is the difference between the GoF Builder and the fluent builder?',
        answer: `The Gang of Four Builder has four components: Builder (abstract interface for construction steps), ConcreteBuilder (implements the steps and assembles the product), Director (defines the order of construction steps), and Product (the complex object being built). The Director calls builder methods in a specific sequence, and the ConcreteBuilder accumulates the result.

The fluent builder (Bloch's Builder) is simpler and more common in practice. It is a static inner class of the product with setter-like methods that return "this" for chaining, and a build() method that returns the final product. There is no separate Director; the client chains the methods directly. The fluent builder is ideal for objects with many optional parameters. The GoF Builder is better when the construction sequence itself varies (different directors produce different configurations).`
      },
      {
        question: 'When should you use the Builder pattern?',
        answer: `Use Builder when: the constructor has more than 4-5 parameters, especially optional ones. When the object requires step-by-step construction (configuring a network connection: set host, set port, enable TLS, set timeout, build). When the same construction process should create different representations (a meal builder that creates both regular and vegetarian meals). When you want immutable objects with many fields (the builder accumulates mutable state and produces an immutable result).

Do not use Builder for simple objects with few parameters. A Point(x, y) does not need a builder. A User(name, email) is fine with a constructor. Builder adds complexity that should be justified by the actual construction complexity of the product.`
      },
      {
        question: 'How do you ensure required fields are set in a Builder?',
        answer: `Several approaches: pass required fields to the builder's constructor (UserBuilder(name, email) guarantees name and email are always set; optional fields are set through chainable methods). Validate in the build() method and throw an exception if required fields are missing. Use a step builder (TypeSafe Builder) where the type system enforces the order: AddressBuilder.street("123 Main") returns a WithStreet type that only has .city() method, ensuring street is set before city.

The step builder approach uses a chain of interfaces to guide construction, making it impossible to call build() until all required steps are completed. This moves validation from runtime to compile time, which is the safest approach but adds more interface types. In interviews, mention all three approaches and explain the trade-offs.`
      }
    ],

    codeExample: `# Python — Fluent Builder for HTTP request
class HttpRequest:
    def __init__(self, builder):
        self.method = builder._method
        self.url = builder._url
        self.headers = dict(builder._headers)
        self.body = builder._body
        self.timeout = builder._timeout

    def __repr__(self):
        return f"{self.method} {self.url} headers={self.headers}"

class HttpRequestBuilder:
    def __init__(self, method: str, url: str):  # Required params
        self._method = method
        self._url = url
        self._headers = {}
        self._body = None
        self._timeout = 30

    def header(self, key: str, value: str) -> 'HttpRequestBuilder':
        self._headers[key] = value
        return self  # Enable chaining

    def body(self, data: str) -> 'HttpRequestBuilder':
        self._body = data
        return self

    def timeout(self, seconds: int) -> 'HttpRequestBuilder':
        self._timeout = seconds
        return self

    def build(self) -> HttpRequest:
        if not self._url:
            raise ValueError("URL is required")
        return HttpRequest(self)

# Usage — fluent chaining
request = (HttpRequestBuilder("POST", "https://api.example.com/users")
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer token123")
    .body('{"name": "Alice"}')
    .timeout(10)
    .build())

print(request)
# POST https://api.example.com/users headers={'Content-Type': 'application/json', 'Authorization': 'Bearer token123'}`,

    tips: [
      'Use the fluent builder (Bloch style) for objects with many optional parameters',
      'Pass required parameters to the builder constructor; chain optional parameters',
      'Make the product class constructor private so that objects can only be created through the builder',
      'The build() method should validate the accumulated state before constructing the product',
      'In Java, implement the builder as a static inner class of the product; in Python, use keyword arguments or a builder class'
    ],

    sampleQuestions: [
      'Implement a fluent builder for an HTTP request object',
      'What is the difference between Builder and Factory patterns?',
      'How do you enforce required fields in a Builder?',
      'When is a constructor with many parameters acceptable instead of using Builder?',
      'Design a builder for a complex report generation system'
    ]
  },
  {
    id: 'prototype',
    title: 'Prototype Pattern',
    icon: 'puzzle',
    color: '#f59e0b',
    questions: 5,
    description: 'Create new objects by cloning existing instances rather than constructing from scratch.',

    introduction: `The Prototype pattern creates new objects by copying (cloning) an existing object, known as the prototype. Instead of calling a constructor and configuring the new object from scratch, you take a fully configured object and duplicate it. This is useful when object creation is expensive (complex initialization, database lookups, network calls) or when you want to create variations of a pre-configured template.

Think of a document template system. You have a standard contract template with 50 fields pre-filled with default values. Instead of creating a new Contract object and setting all 50 fields, you clone the template and modify only the fields that differ (client name, dates, specific terms). The clone operation copies the entire object state in one step.

The Prototype pattern requires implementing a clone() method on the prototypical object. This introduces the distinction between shallow copy (copies field values; for reference types, both the original and clone point to the same objects) and deep copy (recursively copies all referenced objects so the clone is fully independent). Getting this right is critical and a frequent interview topic.`,

    keyQuestions: [
      {
        question: 'What is the difference between shallow copy and deep copy?',
        answer: `A shallow copy creates a new object and copies all field values. For primitive fields (int, boolean), this gives the clone its own copy. For reference fields (objects, arrays), the clone gets a copy of the reference, not the referenced object. Both the original and clone point to the same nested objects. Modifying a nested object through the clone also modifies it for the original.

A deep copy recursively clones all referenced objects, creating a fully independent copy. The clone and original share no mutable state. Deep copy is more expensive but safer. In Java, Object.clone() performs a shallow copy by default; you must override clone() for deep copy. In Python, copy.copy() is shallow and copy.deepcopy() is deep. The choice depends on whether nested objects are shared intentionally (shallow) or need independence (deep).`
      },
      {
        question: 'When should you use the Prototype pattern?',
        answer: `Use Prototype when: creating an object is significantly more expensive than cloning it (complex computations, external resource loading, database queries during construction). When you need many variations of a pre-configured base object (game characters with default stats, document templates, configuration presets). When the concrete class of the object to create is determined at runtime and you want to avoid a parallel hierarchy of factories.

A prototype registry can store named prototypes: registry.get("standardContract").clone() gives you a new contract based on the template. This is especially powerful combined with Abstract Factory: instead of creating product objects from scratch, the factory stores prototypes and clones them, reducing the number of classes needed.`
      },
      {
        question: 'How do you implement the Prototype pattern correctly?',
        answer: `In Java: implement Cloneable and override clone(). For shallow copy, call super.clone(). For deep copy, call super.clone() and then manually clone each mutable reference field. Be careful with final fields (they cannot be reassigned after clone() returns).

In Python: implement __copy__ for shallow copy and __deepcopy__ for deep copy, or use copy.copy() and copy.deepcopy() which work on most objects by default. For custom control, override these dunder methods to skip fields, transform values, or handle circular references.

In both languages, consider using a copy constructor instead of clone(): a constructor that takes an existing instance and copies its fields. This avoids the complexities of clone() in Java (the Cloneable interface, checked exceptions, type casting) and makes the copy logic explicit.`
      }
    ],

    tips: [
      'Prefer deep copy when the clone must be fully independent; use shallow copy only when sharing nested objects is intentional',
      'Consider a copy constructor as an alternative to the clone() method; it is explicit and avoids Cloneable issues in Java',
      'Use a prototype registry (HashMap of named prototypes) for frequently cloned templates',
      'Be aware of circular references when implementing deep copy; they cause infinite recursion without cycle detection',
      'In interviews, always clarify whether the problem needs shallow or deep copy'
    ],

    sampleQuestions: [
      'Implement deep copy for an object with nested references',
      'What are the pitfalls of Java\'s clone() method?',
      'How does the Prototype pattern reduce the need for subclassing?',
      'Design a prototype registry for a game character creation system',
      'Compare copy constructors with the clone() method'
    ]
  },

  // ─────────────────────────────────────────
  // Structural Patterns
  // ─────────────────────────────────────────
  {
    id: 'adapter',
    title: 'Adapter Pattern',
    icon: 'link',
    color: '#06b6d4',
    questions: 6,
    description: 'Convert the interface of a class into another interface clients expect.',

    introduction: `The Adapter pattern allows two incompatible interfaces to work together. It acts as a bridge between an existing class with one interface and a client that expects a different interface. Just as a power adapter lets a US plug work in a European socket, the software adapter translates calls from one interface format to another.

Consider integrating a legacy XML-based analytics service into a system that expects JSON. You cannot modify the legacy service, and you should not modify all the client code. An adapter wraps the legacy service and translates: the client calls analyze(jsonData), and the adapter converts the JSON to XML internally, calls the legacy service, converts the XML response back to JSON, and returns it to the client. Neither the client nor the legacy service is modified.

There are two forms. The object adapter uses composition: it holds a reference to the adaptee and delegates calls, translating between interfaces. The class adapter uses multiple inheritance: it inherits from both the target interface and the adaptee class. Object adapters are more flexible (they can adapt any subclass of the adaptee) and are preferred in languages that do not support multiple inheritance.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Adapter pattern?',
        answer: `Four participants: Target is the interface the client expects. Adaptee is the existing class with the incompatible interface. Adapter implements Target and wraps (or extends) Adaptee, translating calls. Client uses the Target interface.

Object adapter (composition): Adapter implements Target and holds a reference to Adaptee. When the client calls adapter.request(), the adapter calls adaptee.specificRequest() internally, translating parameters and return values as needed. Class adapter (inheritance): Adapter extends Adaptee and implements Target. It inherits the adaptee's implementation and overrides methods to match the target interface. Class adapter avoids the delegation overhead but works only when single inheritance allows it.`
      },
      {
        question: 'When should you use the Adapter pattern?',
        answer: `Use Adapter when: you want to use an existing class but its interface does not match what your code needs. When you are integrating third-party libraries or legacy code that you cannot modify. When you want to create a reusable class that cooperates with unrelated or unforeseen classes.

Real-world examples: wrapping a logging framework so your code uses a generic Logger interface (if you switch from Log4j to SLF4J, you only change the adapter). Adapting a payment gateway SDK to match your PaymentProcessor interface. Converting between data formats (XML to JSON, protobuf to REST objects). In Java, Arrays.asList() adapts an array to the List interface. InputStreamReader adapts byte streams (InputStream) to character streams (Reader).`
      },
      {
        question: 'How is the Adapter pattern different from Facade and Decorator?',
        answer: `Adapter changes the interface of an existing object to match what the client expects. The functionality stays the same; only the interface changes. Facade simplifies a complex subsystem by providing a single unified interface. It does not change an interface to match another; it creates a new, simpler one. Decorator adds new behavior to an existing object without changing its interface. The interface stays the same; the functionality changes.

A memory aid: Adapter makes things compatible (changes the interface), Facade makes things simple (hides complexity), and Decorator makes things enhanced (adds behavior). In interviews, being able to distinguish these three is important because they are frequently confused due to their structural similarity (all three wrap another object).`
      }
    ],

    tips: [
      'Prefer object adapter (composition) over class adapter (inheritance) for flexibility',
      'Keep the adapter thin; it should only translate interfaces, not add business logic',
      'Use adapters at system boundaries to isolate your code from third-party library interfaces',
      'In Java, the "wrapper" classes (Integer wrapping int) are a form of adapter',
      'In interviews, always clarify whether you should modify the existing classes or create an adapter'
    ],

    sampleQuestions: [
      'Design an adapter to integrate a legacy payment system with a modern API',
      'What is the difference between object adapter and class adapter?',
      'How is the Adapter pattern different from Facade?',
      'When would you use an adapter vs modifying the existing class?',
      'Implement an adapter that converts XML responses to JSON'
    ]
  },
  {
    id: 'facade',
    title: 'Facade Pattern',
    icon: 'link',
    color: '#06b6d4',
    questions: 5,
    description: 'Provide a simplified interface to a complex subsystem.',

    introduction: `The Facade pattern provides a single, simplified interface to a complex subsystem of classes. Instead of forcing clients to interact with dozens of classes and understand their relationships, the facade exposes a few high-level methods that handle the coordination internally. It does not add new functionality; it makes existing functionality easier to use.

Consider a home theater system with a DVD player, projector, sound system, lights, and screen. To watch a movie, you would need to dim the lights, lower the screen, turn on the projector, set the input source, power on the sound system, set the volume, and start the DVD. A HomeTheaterFacade provides a single watchMovie(title) method that orchestrates all these steps. The subsystem classes still exist and can be accessed directly for fine-grained control, but most callers just want the simplified interface.

Facades are ubiquitous in real software. An ORM is a facade over raw SQL queries. A high-level HTTP client is a facade over socket management, TLS handshakes, and connection pooling. Even a simple function that encapsulates a sequence of low-level calls is a mini-facade. The pattern reduces the learning curve for using a subsystem and decouples clients from subsystem changes.`,

    keyQuestions: [
      {
        question: 'What is the difference between Facade and Adapter?',
        answer: `A Facade creates a new, simplified interface for a complex subsystem. It does not change an existing interface to match another; it defines a new one that is easier to use. An Adapter changes an existing interface to match what a client expects, without simplifying or adding functionality.

Facade is about simplification: many classes behind one simple interface. Adapter is about compatibility: one class behind a different interface. A Facade wraps an entire subsystem; an Adapter wraps a single class. You might use both together: a Facade simplifies subsystem access, and within the facade, an Adapter converts an incompatible third-party library interface.`
      },
      {
        question: 'Should clients still be able to access subsystem classes directly?',
        answer: `Yes. A Facade is not meant to hide or restrict access to the subsystem. It provides a convenient shortcut for common operations, but clients who need fine-grained control should be able to interact with subsystem classes directly. This is what distinguishes Facade from encapsulation.

In practice, you can control this through package/module visibility. Make the facade public and subsystem classes package-private if you want to enforce usage through the facade. Or keep everything public and document that the facade is the recommended entry point. The decision depends on whether the subsystem is stable enough for direct use or too fragile for clients to interact with safely.`
      },
      {
        question: 'When does a Facade become an anti-pattern?',
        answer: `A Facade becomes problematic when it grows into a "God object" that does everything. If your OrderFacade has methods for order creation, inventory management, payment processing, shipping, notifications, and reporting, it has become a dumping ground for all subsystem coordination. This violates SRP.

The solution is to create multiple focused facades. An OrderFacade handles order lifecycle. A PaymentFacade handles payment processing. A ShippingFacade handles logistics. Each facade simplifies its own subsystem without becoming a monolithic coordinator. Another anti-pattern is a Facade that adds business logic instead of just delegating. A Facade should orchestrate, not implement.`
      }
    ],

    tips: [
      'A Facade should delegate to subsystem classes, not implement business logic itself',
      'Use multiple focused facades rather than one large one to avoid the God object anti-pattern',
      'The Facade pattern is often the first step in refactoring legacy code: wrap the mess behind a clean interface',
      'Facades are natural entry points for subsystems and make good candidates for API boundaries',
      'In interviews, demonstrate Facade with a real-world analogy like the home theater system'
    ],

    sampleQuestions: [
      'Design a Facade for a complex subsystem like a travel booking system',
      'How does Facade differ from a Service class?',
      'When does a Facade become a God object?',
      'How do you test code that uses a Facade?',
      'Should a Facade throw subsystem-specific exceptions or translate them?'
    ]
  },
  {
    id: 'decorator-pattern',
    title: 'Decorator Pattern',
    icon: 'link',
    color: '#06b6d4',
    questions: 6,
    description: 'Attach additional responsibilities to an object dynamically.',

    introduction: `The Decorator pattern lets you add new behavior to an object dynamically by wrapping it in another object that has the same interface. Instead of creating subclasses for every combination of behaviors, you stack decorators like layers. Each decorator adds one behavior and delegates the rest to the wrapped object.

Consider a coffee ordering system. You have a basic Coffee with a cost of $2. You can add Milk (+$0.50), Whip (+$0.75), and Caramel (+$1.00). With inheritance, you would need classes for Coffee, CoffeeWithMilk, CoffeeWithWhip, CoffeeWithMilkAndWhip, CoffeeWithMilkAndCaramel, and so on. With decorators, you create MilkDecorator, WhipDecorator, and CaramelDecorator. A caramel milk coffee is: new CaramelDecorator(new MilkDecorator(new Coffee())). Each decorator wraps the previous, adding its cost and description.

The key advantage is combinatorial flexibility. Three decorators can create eight different combinations. Ten decorators can create over a thousand. Inheritance would require a separate class for each combination. Decorators can also be added or removed at runtime, which inheritance cannot support.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Decorator pattern?',
        answer: `Four components: Component is the interface that both concrete components and decorators implement (Beverage with cost() and description()). ConcreteComponent is the base object being decorated (Coffee, Tea). Decorator is an abstract class that implements Component and holds a reference to another Component (the wrapped object). ConcreteDecorator extends Decorator and adds specific behavior (MilkDecorator, WhipDecorator).

The decorator's methods call the wrapped object's methods and add their own behavior. For cost(): return wrappedComponent.cost() + milkCost. This delegation chain means decorators are transparent: the client works with the Component interface and does not know whether it is dealing with the base object or a stack of decorators.`
      },
      {
        question: 'How is the Decorator pattern different from inheritance?',
        answer: `Inheritance adds behavior at compile time; the set of behaviors is fixed in the class hierarchy. Decorators add behavior at runtime; you can mix and match any combination dynamically. Inheritance creates an explosion of subclasses for all possible combinations. Decorators create a small number of decorator classes that can be composed freely.

Inheritance is "is-a": a FlyingFish IS-A Fish. Decorators are "has-a" plus delegation: a MilkDecorator HAS-A Beverage and delegates to it while adding milk behavior. Decorators also support removing or changing behavior at runtime (unwrap or replace a decorator), which inheritance cannot do. The trade-off is that decorated objects have a different identity than the wrapped object (decorator != wrappedObject), which can cause issues with equals/hashCode and type checking.`
      },
      {
        question: 'What are real-world examples of the Decorator pattern?',
        answer: `Java I/O streams are the canonical example. InputStream is the component. FileInputStream is the concrete component. BufferedInputStream, DataInputStream, and GZIPInputStream are decorators. You compose them: new BufferedInputStream(new GZIPInputStream(new FileInputStream("data.gz"))). Each layer adds functionality (buffering, decompression) without modifying the underlying stream.

In web frameworks, middleware is a form of decorator. Each middleware wraps the next handler: LoggingMiddleware(AuthMiddleware(RateLimitMiddleware(RequestHandler))). Each layer adds behavior (logging, authentication, rate limiting) and delegates to the next. Python's @decorator syntax is syntactic sugar for the Decorator pattern, though Python decorators are applied to functions rather than objects.`
      }
    ],

    tips: [
      'Decorator and the wrapped component must implement the same interface for transparency',
      'Keep each decorator focused on one responsibility; do not combine multiple behaviors in one decorator',
      'Be aware that decorated objects have different identity than the wrapped object (matters for equals/hashCode)',
      'Java I/O streams are the canonical example; understand BufferedInputStream/DataInputStream as decorators',
      'In interviews, use the coffee example for clarity and draw the wrapper chain visually'
    ],

    sampleQuestions: [
      'Implement a Decorator for a notification system that adds email, SMS, and Slack channels',
      'How is the Decorator pattern related to Python\'s @decorator syntax?',
      'What are the drawbacks of deeply nested decorators?',
      'How do Java I/O streams use the Decorator pattern?',
      'When would you choose Decorator over Strategy?'
    ]
  },
  {
    id: 'composite',
    title: 'Composite Pattern',
    icon: 'link',
    color: '#06b6d4',
    questions: 5,
    description: 'Compose objects into tree structures and treat individual and composite objects uniformly.',

    introduction: `The Composite pattern lets you compose objects into tree structures to represent part-whole hierarchies. It allows clients to treat individual objects (leaves) and compositions of objects (branches) uniformly through a common interface. This is powerful for any domain with recursive structures.

A file system is the perfect example. A File is a leaf: it has a name and a size. A Directory is a composite: it has a name and contains a list of children, which can be Files or other Directories. Both File and Directory implement a FileSystemNode interface with getName() and getSize(). For a File, getSize() returns the file's size. For a Directory, getSize() sums the sizes of all children recursively. Client code does not need to know whether it is dealing with a file or a directory; it just calls getSize().

The pattern eliminates the need for type-checking conditional logic. Without Composite, you would write "if node is file, return size; if node is directory, iterate children and sum." With Composite, every node knows how to compute its own size, and the recursive structure handles the rest. This is the essence of polymorphism applied to recursive data structures.`,

    keyQuestions: [
      {
        question: 'What are the roles in the Composite pattern?',
        answer: `Component: the common interface for both leaves and composites (FileSystemNode with getName(), getSize()). Leaf: a basic element with no children (File). Composite: an element that contains children of type Component (Directory). The composite stores a collection of children and implements component methods by delegating to its children.

A design decision is where to place child management methods (add, remove, getChild). If placed in Component, leaves inherit methods that do not make sense (you cannot add a child to a file). If placed only in Composite, clients must type-check to access child management. The GoF book puts them in Component for transparency. Modern practice often puts them only in Composite for safety, accepting the need for occasional type checking.`
      },
      {
        question: 'How does the Composite pattern enable recursive operations?',
        answer: `Each composite delegates operations to its children, which may be leaves (base case) or other composites (recursive case). This creates a natural recursion through the tree structure.

For getSize() on a Directory: iterate each child and call child.getSize(). If the child is a File, it returns its size directly. If the child is a Directory, it recursively sums its children's sizes. The recursion terminates at leaf nodes. The same pattern works for any tree operation: rendering a UI component tree, evaluating an expression tree, calculating a bill of materials, or traversing an organization hierarchy. The calling code never needs to handle the recursion explicitly; it is encapsulated in the composite's method implementation.`
      },
      {
        question: 'What are real-world applications of the Composite pattern?',
        answer: `GUI frameworks: a Panel contains Buttons, Labels, and other Panels. Rendering a Panel renders all its children recursively. Organization charts: a Department contains Employees and sub-Departments. Calculating total salary of a department sums all employees recursively. Expression trees: an arithmetic expression like (3 + 4) * 2 is a tree where operators are composites and numbers are leaves.

Menu systems: a Menu contains MenuItems and sub-Menus. Graphics systems: a Group contains Shapes and other Groups. Permission systems: a PermissionGroup contains individual Permissions and sub-Groups. Anywhere you have a tree structure where leaves and branches should be treated uniformly, the Composite pattern applies.`
      }
    ],

    tips: [
      'Use Composite whenever your data naturally forms a tree structure',
      'Keep the Component interface focused on operations common to both leaves and composites',
      'Composite.getSize() should delegate to children and aggregate results; do not replicate child logic',
      'Consider using the Iterator pattern to traverse composite structures',
      'In interviews, the file system example is the clearest; UI component trees are also excellent'
    ],

    sampleQuestions: [
      'Design a Composite for an organizational hierarchy with departments and employees',
      'How do you decide where to place child management methods (Component vs Composite)?',
      'Implement a Composite for an arithmetic expression evaluator',
      'What are the trade-offs between transparency and safety in Composite?',
      'How does the Composite pattern relate to the Visitor pattern?'
    ]
  },
  {
    id: 'proxy',
    title: 'Proxy Pattern',
    icon: 'link',
    color: '#06b6d4',
    questions: 6,
    description: 'Provide a surrogate or placeholder for another object to control access to it.',

    introduction: `The Proxy pattern provides a substitute object that controls access to the original object. The proxy has the same interface as the real object, so clients cannot tell the difference. The proxy intercepts requests, performs some action (access control, caching, lazy loading, logging), and then delegates to the real object.

There are several types of proxies. A virtual proxy delays the creation of an expensive object until it is actually needed (lazy initialization). An image viewer that shows thumbnails initially and loads full-resolution images only when clicked uses a virtual proxy. A protection proxy controls access based on permissions: a document proxy that checks if the current user has permission before allowing edits. A remote proxy represents an object in a different address space (like an RPC stub). A caching proxy stores results of expensive operations and returns cached values for repeated requests.

Proxies are everywhere in real software. Java's dynamic proxies and Python's property descriptors use the proxy concept. ORMs use lazy-loading proxies to defer database queries. API gateways are proxies that add authentication, rate limiting, and logging to backend services. Understanding the Proxy pattern helps you recognize and design these systems.`,

    keyQuestions: [
      {
        question: 'What are the different types of proxies?',
        answer: `Virtual Proxy: delays expensive object creation until needed. A LazyImage proxy stores only the image URL; when display() is called, it loads the actual image. This saves memory and startup time for objects that may never be used.

Protection Proxy: controls access based on permissions. A DocumentProxy checks user.hasPermission("edit") before delegating to the real Document's edit() method. This centralizes authorization without modifying the real class.

Remote Proxy: represents an object in another process, server, or network location. RPC stubs, gRPC client objects, and RMI stubs are remote proxies. They marshal method calls into network requests and unmarshal responses.

Caching Proxy: stores results of expensive operations. A DatabaseQueryProxy caches query results and returns cached values for identical queries. Cache invalidation strategy determines when to delegate to the real database.

Logging Proxy: records method calls for auditing, debugging, or monitoring. Each method call is logged before delegating to the real object.`
      },
      {
        question: 'How is the Proxy pattern different from Decorator?',
        answer: `Both Proxy and Decorator wrap an object with the same interface, but their intent differs. A Proxy controls access to the object: it decides whether, when, and how the real object is accessed. A Decorator adds new behavior to the object: it enhances what the object does.

A Proxy typically creates or manages the lifecycle of the real object internally. A Decorator receives the object to wrap from outside and does not manage its lifecycle. A caching proxy decides whether to call the real object or return a cached result (access control). A logging decorator always calls the real object and adds logging around the call (behavior enhancement). In practice, the implementation looks similar, but naming your class correctly (XProxy vs XDecorator) communicates your intent.`
      },
      {
        question: 'How are proxies used in real frameworks?',
        answer: `Java Dynamic Proxies: java.lang.reflect.Proxy creates proxy objects at runtime that implement specified interfaces. Used by Spring AOP for method interception, transaction management, and security. Hibernate Lazy Loading: collection and entity proxies that defer database queries until the data is actually accessed. This is why accessing a lazy-loaded field outside a session throws LazyInitializationException.

Python descriptors and properties: @property is a proxy that intercepts attribute access and delegates to getter/setter methods. API Gateways (Kong, Envoy, Nginx): reverse proxy servers that intercept HTTP requests and add authentication, rate limiting, logging, and routing before delegating to backend services. Virtual DOM (React): acts as a proxy to the real DOM, batching and optimizing updates before applying them.`
      }
    ],

    tips: [
      'Match the proxy type to your specific need: lazy loading, access control, caching, or remote access',
      'The proxy must implement the same interface as the real subject for transparency',
      'Consider using dynamic proxies (Java) or metaclasses (Python) to avoid writing repetitive proxy classes',
      'In interviews, clearly state which type of proxy you are implementing and why',
      'Be aware that proxies add a layer of indirection, which can complicate debugging'
    ],

    sampleQuestions: [
      'Implement a virtual proxy for lazy-loading large images',
      'How does Hibernate use proxies for lazy loading?',
      'What is the difference between Proxy and Adapter?',
      'Design a protection proxy for a document management system',
      'How do Java dynamic proxies work?'
    ]
  },
  {
    id: 'bridge',
    title: 'Bridge Pattern',
    icon: 'link',
    color: '#06b6d4',
    questions: 5,
    description: 'Decouple an abstraction from its implementation so both can vary independently.',

    introduction: `The Bridge pattern separates an abstraction from its implementation so that both can evolve independently. Without Bridge, combining abstractions and implementations leads to an explosion of classes. If you have 3 shapes (Circle, Square, Triangle) and 3 renderers (Vector, Raster, SVG), inheritance would require 9 classes: VectorCircle, RasterCircle, SVGCircle, and so on. Bridge reduces this to 3 + 3 = 6 classes by separating shape from renderer.

The pattern creates two independent hierarchies connected by composition. The abstraction hierarchy (Shape with Circle, Square, Triangle) holds a reference to an implementation object (Renderer interface with VectorRenderer, RasterRenderer, SVGRenderer). Circle.draw() delegates to renderer.renderCircle(), and the specific rendering behavior depends on which renderer was injected. You can combine any shape with any renderer without creating a new class for each combination.

Bridge is one of the harder patterns to recognize in practice because it looks like simple dependency injection. The distinguishing factor is that both sides of the bridge have their own hierarchy and can vary independently. It is particularly useful when you need to support multiple platforms, multiple output formats, or multiple backend implementations for the same abstraction.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Bridge pattern?',
        answer: `Abstraction: the high-level class that defines the interface used by clients. It holds a reference to an Implementor. RefinedAbstraction: extends Abstraction with more specific behavior (Circle extends Shape). Implementor: the interface for the implementation hierarchy. ConcreteImplementor: specific implementation classes (VectorRenderer, RasterRenderer).

The Abstraction delegates implementation-specific work to the Implementor. Shape.draw() calls renderer.renderShape(). This delegation is the "bridge" between the two hierarchies. Changing or adding a shape does not affect renderers, and changing or adding a renderer does not affect shapes. The two hierarchies grow independently, connected only through the Implementor interface.`
      },
      {
        question: 'How is Bridge different from Strategy?',
        answer: `Bridge and Strategy are structurally similar: both use composition to delegate work to another object through an interface. The difference is in intent and scope. Strategy encapsulates interchangeable algorithms for a specific behavior (sorting algorithms, compression algorithms). The context class has one strategy slot for one purpose.

Bridge separates two fundamental dimensions of a design that both need to vary independently. The abstraction and implementation are not just algorithm variants; they represent different conceptual axes (shape vs rendering, device vs driver, business logic vs platform). Bridge is a structural pattern about organizing class hierarchies. Strategy is a behavioral pattern about selecting algorithms. If both sides have hierarchies that grow independently, it is Bridge. If one side is a single class and the other side has interchangeable variants, it is Strategy.`
      },
      {
        question: 'When should you apply the Bridge pattern?',
        answer: `Apply Bridge when you see a class hierarchy growing along two or more dimensions simultaneously. If adding a new shape requires adding classes for every renderer, or adding a new renderer requires adding classes for every shape, Bridge will simplify the design.

Real-world examples: cross-platform GUI (Window abstraction + LinuxWindow/WindowsWindow, with DrawingAPI implementation + OpenGLAPI/DirectXAPI). Database abstraction layers: QueryBuilder abstraction (SelectQuery, InsertQuery) with DatabaseDriver implementation (MySQL, PostgreSQL, SQLite). Remote controls: RemoteControl abstraction (BasicRemote, AdvancedRemote) with Device implementation (TV, Radio, DVDPlayer). Whenever you have M x N class combinations, Bridge reduces them to M + N.`
      }
    ],

    tips: [
      'Look for "M x N" class explosions as a signal that Bridge is needed',
      'The abstraction should define high-level operations; the implementor should define low-level primitives',
      'Inject the implementor through the abstraction\'s constructor (dependency injection)',
      'Bridge separates "what" from "how" at the hierarchy level, not just the method level',
      'In interviews, draw both hierarchies separately and show how composition connects them'
    ],

    sampleQuestions: [
      'Design a Bridge for a cross-platform notification system',
      'What is the difference between Bridge and Adapter?',
      'How does Bridge reduce the number of classes in an M x N scenario?',
      'When would you refactor an inheritance hierarchy into a Bridge?',
      'Draw a class diagram showing the Bridge pattern for shapes and renderers'
    ]
  },
  {
    id: 'flyweight',
    title: 'Flyweight Pattern',
    icon: 'link',
    color: '#06b6d4',
    questions: 5,
    description: 'Share fine-grained objects efficiently to reduce memory consumption.',

    introduction: `The Flyweight pattern minimizes memory usage by sharing as much data as possible between similar objects. Instead of creating a new object for each instance, the pattern identifies shared (intrinsic) state and unique (extrinsic) state, stores the shared state in a pool of reusable flyweight objects, and passes the unique state as method parameters.

Consider a text editor rendering a million characters. Each character could be an object with font, size, color, and position. Without Flyweight, a million character objects consume enormous memory. With Flyweight, the font/size/color combinations (intrinsic state) are shared. There might be only 50 unique font/size/color combinations across the entire document. These 50 flyweight objects are shared among all million characters, with each character's position (extrinsic state) passed to the rendering method at runtime.

The pattern works by separating an object's state into intrinsic (shared, immutable, context-independent) and extrinsic (unique, mutable, context-dependent) parts. A FlyweightFactory manages the pool of shared objects, returning existing instances when possible and creating new ones only when a new combination of intrinsic state is requested.`,

    keyQuestions: [
      {
        question: 'What is intrinsic vs extrinsic state?',
        answer: `Intrinsic state is the shared, immutable data stored inside the flyweight object. It does not depend on context and can be reused across many instances. In the text editor example, the font family, font size, and text color are intrinsic because many characters share the same formatting.

Extrinsic state is the unique, context-dependent data that varies between instances and cannot be shared. In the text editor, each character's position on the page and the specific character code are extrinsic. This state is not stored in the flyweight; it is passed as parameters when the flyweight's methods are called. The key design decision is correctly separating intrinsic from extrinsic state: too much intrinsic state creates too many unique flyweights (defeating the purpose), while too much extrinsic state increases the overhead of passing parameters.`
      },
      {
        question: 'How does the FlyweightFactory work?',
        answer: `The FlyweightFactory maintains a pool (typically a HashMap) of flyweight objects keyed by their intrinsic state. When a client requests a flyweight with specific intrinsic state, the factory checks the pool. If a matching flyweight exists, it returns the existing one. If not, it creates a new flyweight, stores it in the pool, and returns it.

This ensures that each unique combination of intrinsic state has exactly one flyweight object in memory. The factory is the single point of flyweight creation; clients never create flyweights directly. Example: CharacterFlyweightFactory.get("Arial", 12, "black") returns the shared flyweight for Arial 12pt black text, creating it on first request and reusing it for all subsequent requests with the same parameters.`
      },
      {
        question: 'Where is the Flyweight pattern used in real systems?',
        answer: `Java String interning: the JVM maintains a string pool. String literals with the same value share the same object. String.intern() explicitly adds a string to the pool. This is why "hello" == "hello" is true in Java (same reference from the pool).

Java Integer caching: Integer.valueOf(n) for values -128 to 127 returns cached instances from a pool rather than creating new objects. Game engines: a forest of 10,000 trees might share only 5 tree model objects (oak, pine, birch, maple, willow), with each tree's position and rotation as extrinsic state. Icon systems: a UI with hundreds of buttons might share a few dozen icon sprites, with position and state (enabled/disabled) as extrinsic data.`
      }
    ],

    tips: [
      'Flyweight only makes sense when there are many objects sharing a limited set of intrinsic state combinations',
      'Intrinsic state must be immutable; if it can change, sharing becomes dangerous',
      'Use a factory with a HashMap to manage the flyweight pool',
      'Measure memory savings before applying; the pattern adds complexity that should be justified',
      'In interviews, the text editor and game character examples are the clearest demonstrations'
    ],

    sampleQuestions: [
      'Design a Flyweight for a text rendering system',
      'What is the difference between intrinsic and extrinsic state?',
      'How does Java\'s String interning relate to the Flyweight pattern?',
      'When would using the Flyweight pattern actually make performance worse?',
      'Implement a Flyweight pool for game sprite management'
    ]
  },

  // ─────────────────────────────────────────
  // Behavioral Patterns
  // ─────────────────────────────────────────
  {
    id: 'iterator',
    title: 'Iterator Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 5,
    description: 'Provide a way to access elements of a collection sequentially without exposing its internal structure.',

    introduction: `The Iterator pattern provides a standard way to traverse a collection of elements without exposing the collection's internal data structure. The client code uses a uniform interface (hasNext(), next()) regardless of whether the underlying collection is an array, linked list, tree, graph, or hash map. The collection knows how to create an iterator; the iterator knows how to traverse.

Without the Iterator pattern, traversing a tree would require different code than traversing a list. The client would need to know the internal structure: "for array, use index; for linked list, follow next pointers; for tree, use recursion." With iterators, all collections expose the same traversal interface, and the traversal logic is encapsulated in iterator objects specific to each data structure.

Iterators are so fundamental that most modern languages build them into the language itself. Java has the Iterable/Iterator interfaces and for-each loops. Python has the __iter__/__next__ protocol and for loops. JavaScript has the Symbol.iterator protocol. Understanding the pattern behind these language features helps you implement custom iterators for your own data structures and recognize iterator-related design decisions in frameworks.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Iterator pattern?',
        answer: `Four participants: Iterator is the interface with methods for traversal (hasNext(), next(), optionally remove()). ConcreteIterator implements Iterator for a specific collection type, maintaining the current position and knowing how to advance.

Aggregate (or Iterable) is the interface for collections, with a method to create an iterator (createIterator() or iterator()). ConcreteAggregate implements Aggregate and returns the appropriate ConcreteIterator. The client works with Iterator and Aggregate interfaces, never with concrete implementations. A BinaryTree (ConcreteAggregate) might offer inOrderIterator(), preOrderIterator(), and postOrderIterator() methods, each returning a different ConcreteIterator that traverses the tree in a different order.`
      },
      {
        question: 'What are internal vs external iterators?',
        answer: `An external iterator puts the client in control of the traversal. The client calls next() to advance and hasNext() to check for more elements. This gives maximum flexibility: the client can pause, skip, or interleave multiple iterators. Java's Iterator and Python's __next__ are external iterators.

An internal iterator takes a function/callback and applies it to each element internally. The collection controls the traversal; the client just provides the operation. Java's forEach(lambda) and Python's map() use internal iteration. Ruby's blocks and Smalltalk's collection methods are classic internal iterators. External iterators are more flexible; internal iterators are more concise. Modern languages support both: Python's for loop uses external iteration, while list comprehensions and map/filter use internal iteration.`
      },
      {
        question: 'How do you implement a custom iterator for a complex data structure?',
        answer: `For a tree with in-order traversal: the iterator maintains a stack initialized by pushing nodes down the left spine from the root. next() pops the top node, pushes the right child's left spine, and returns the popped node's value. hasNext() returns whether the stack is non-empty.

For a graph with BFS traversal: the iterator maintains a queue and a visited set. next() dequeues the front node, enqueues its unvisited neighbors, marks them visited, and returns the dequeued node. For a paginated API: the iterator fetches one page at a time, maintains a cursor, and requests the next page when the current page is exhausted. In all cases, the complexity of traversal is hidden inside the iterator; the client code is simply "while hasNext, process next."`
      }
    ],

    tips: [
      'Implement the standard iterator protocol for your language (Iterable/Iterator in Java, __iter__/__next__ in Python)',
      'Consider offering multiple iterators for different traversal orders on the same collection',
      'Generators (yield in Python, yield return in C#) provide a concise way to implement iterators',
      'Be aware of ConcurrentModificationException: iterating a collection while modifying it is usually forbidden',
      'In interviews, implementing a custom iterator for a tree or graph is a common exercise'
    ],

    sampleQuestions: [
      'Implement an iterator for a binary search tree that traverses in-order',
      'What is the difference between internal and external iterators?',
      'How do Python generators relate to the Iterator pattern?',
      'What happens if you modify a collection while iterating over it?',
      'Design an iterator for a paginated API response'
    ]
  },
  {
    id: 'observer',
    title: 'Observer Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 7,
    description: 'Define a one-to-many dependency so that when one object changes state, all dependents are notified.',

    introduction: `The Observer pattern establishes a one-to-many relationship between a subject (the object being watched) and its observers (objects interested in changes). When the subject's state changes, it automatically notifies all registered observers, and each observer updates itself accordingly. This decouples the subject from its observers; the subject does not need to know what the observers do with the notification.

Think of a newspaper subscription. The newspaper publisher (subject) maintains a list of subscribers (observers). When a new edition is published, all subscribers are notified. Subscribers can join or leave at any time without affecting the publisher or other subscribers. The publisher does not know or care what each subscriber does with the newspaper; it just delivers.

Observer is the foundation of event-driven programming. GUI button click handlers, DOM event listeners, reactive programming (RxJS, Project Reactor), message bus systems, and even database triggers follow the Observer pattern. In modern JavaScript, the EventEmitter class is a direct implementation. Understanding Observer helps you design loosely coupled systems that react to state changes efficiently.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Observer pattern?',
        answer: `Subject (Observable): maintains a list of observers and provides methods to register (subscribe), remove (unsubscribe), and notify observers. When its state changes, it calls notify(), which iterates through all registered observers and calls their update method.

Observer: defines an interface with an update() method that the subject calls on notification. ConcreteSubject: the specific subject being observed, holding the state that triggers notifications. ConcreteObserver: specific observers that implement the update() method with their reaction logic.

Two notification models exist: push (the subject sends the changed data to observers in the update call) and pull (the subject sends a minimal notification, and observers query the subject for the data they need). Push is simpler but may send unnecessary data. Pull is more flexible but requires observers to know the subject's interface.`
      },
      {
        question: 'What are the common pitfalls of the Observer pattern?',
        answer: `Memory leaks: if observers register but never unregister, they are kept alive by the subject's reference list even when they are otherwise eligible for garbage collection. This is the "lapsed listener problem." In Java, use WeakReferences in the observer list to mitigate this. In JavaScript, use removeEventListener or AbortController.

Unexpected update order: the subject notifies observers in list order, which may not be the order you expect. Do not rely on notification order. Cascade updates: if an observer's update modifies the subject, it can trigger another round of notifications, causing infinite loops or hard-to-debug cascading changes. Guard against this with a "notifying" flag that suppresses re-notification.

Performance: notifying many observers synchronously can block the subject. For high-frequency events, consider async notification, batching updates, or throttling/debouncing.`
      },
      {
        question: 'How does Observer relate to event-driven and reactive programming?',
        answer: `Event-driven programming is Observer at the system level. DOM events (click, keypress) are subjects; event handlers are observers. Node.js EventEmitter is an Observer implementation. Publish-subscribe (pub/sub) is a variant where subjects and observers communicate through a broker (message queue), adding further decoupling.

Reactive programming (RxJS, Reactor, RxJava) extends Observer with operators for transforming, filtering, combining, and error-handling event streams. An Observable emits items over time; Observers subscribe and react. Operators like map, filter, debounce, and merge compose complex event processing pipelines. Reactive programming is essentially Observer pattern plus functional composition, and understanding Observer is a prerequisite for working with reactive frameworks.`
      }
    ],

    codeExample: `# Python — Observer pattern for stock price ticker
from abc import ABC, abstractmethod
from typing import List

class Observer(ABC):
    @abstractmethod
    def update(self, stock: str, price: float) -> None:
        pass

class StockTicker:
    """Subject that notifies observers of price changes."""
    def __init__(self):
        self._observers: List[Observer] = []
        self._prices: dict = {}

    def attach(self, observer: Observer) -> None:
        self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        self._observers.remove(observer)

    def set_price(self, stock: str, price: float) -> None:
        self._prices[stock] = price
        self._notify(stock, price)

    def _notify(self, stock: str, price: float) -> None:
        for observer in self._observers:
            observer.update(stock, price)

class PriceAlert(Observer):
    def __init__(self, threshold: float):
        self.threshold = threshold

    def update(self, stock: str, price: float) -> None:
        if price > self.threshold:
            print(f"ALERT: {stock} exceeded {self.threshold} at {price}")

class PriceLogger(Observer):
    def update(self, stock: str, price: float) -> None:
        print(f"LOG: {stock} = {price}")

# Usage
ticker = StockTicker()
ticker.attach(PriceAlert(150.0))
ticker.attach(PriceLogger())
ticker.set_price("AAPL", 155.0)
# Output: ALERT: AAPL exceeded 150.0 at 155.0
#         LOG: AAPL = 155.0`,

    tips: [
      'Use weak references for observers when possible to prevent memory leaks',
      'Consider async notification for performance-sensitive subjects with many observers',
      'Guard against infinite notification loops when an observer modifies the subject during update',
      'In Java, prefer PropertyChangeListener or reactive libraries over implementing Observer from scratch',
      'In interviews, mention both push (send data) and pull (send signal) notification models and their trade-offs'
    ],

    sampleQuestions: [
      'Implement an Observer pattern for a stock price ticker',
      'What is the lapsed listener problem and how do you prevent it?',
      'How does the Observer pattern differ from the pub-sub pattern?',
      'Design an event system that supports typed events and filtered subscriptions',
      'How does reactive programming extend the Observer pattern?'
    ]
  },
  {
    id: 'strategy',
    title: 'Strategy Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 6,
    description: 'Define a family of algorithms, encapsulate each one, and make them interchangeable.',

    introduction: `The Strategy pattern defines a family of algorithms, encapsulates each one in a separate class, and makes them interchangeable. The algorithm can be selected at runtime without altering the client code that uses it. Instead of hard-coding an algorithm inside a class or using conditionals to select between algorithms, you extract each algorithm into its own class implementing a common interface.

Consider a navigation app that calculates routes. The routing algorithm differs based on the mode of transport: driving follows roads and avoids one-way violations, walking allows pedestrian paths and shortcuts, and cycling prefers bike lanes. Without Strategy, the route calculator has a massive if-else chain. With Strategy, you create DrivingStrategy, WalkingStrategy, and CyclingStrategy, each implementing a RouteStrategy interface. The navigation app holds a RouteStrategy reference and delegates route calculation to it. Changing the mode at runtime means swapping the strategy object.

Strategy is one of the most practical and frequently used patterns. It appears in sorting (comparators), validation (different validation rules), pricing (different discount algorithms), compression (gzip, deflate, brotli), and authentication (different auth providers). Whenever you see "different ways to do the same thing," think Strategy.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Strategy pattern?',
        answer: `Three participants: Strategy is the interface declaring the algorithm method (calculateRoute(origin, destination)). ConcreteStrategy implements the Strategy interface with a specific algorithm (DrivingStrategy, WalkingStrategy, CyclingStrategy). Context is the class that uses a Strategy, holding a reference to a Strategy object and delegating the algorithm call to it (Navigator holds a RouteStrategy).

The Context can receive the strategy through its constructor, a setter method, or a method parameter. Constructor injection fixes the strategy for the object's lifetime. Setter injection allows changing the strategy at runtime. Method parameter injection allows per-call strategy selection. The choice depends on how often the strategy needs to change.`
      },
      {
        question: 'How is Strategy different from Template Method?',
        answer: `Both patterns achieve the same goal (varying an algorithm) but through different mechanisms. Strategy uses composition: the algorithm is in a separate object, injected into the context. Template Method uses inheritance: the algorithm skeleton is in the parent class, and subclasses override specific steps.

Strategy is more flexible: you can change the algorithm at runtime and combine strategies freely. Template Method is simpler: it does not require a separate class per algorithm. Use Strategy when algorithms are completely independent and interchangeable. Use Template Method when algorithms share a common skeleton and differ only in specific steps. In practice, Strategy is preferred in modern development because composition is more flexible than inheritance.`
      },
      {
        question: 'How do you implement Strategy in languages with first-class functions?',
        answer: `In languages like Python, JavaScript, and Kotlin, you can pass functions directly instead of creating strategy classes. Instead of a SortStrategy interface with a compare() method, you pass a comparator function: list.sort(key=lambda x: x.name). Instead of a ValidationStrategy class, you pass a validation function: validate(data, rules=[is_not_empty, is_valid_email]).

This is the Strategy pattern in functional form. The intent is identical: encapsulate interchangeable algorithms and select at runtime. The implementation is lighter because anonymous functions or lambdas eliminate the need for separate classes. For simple, single-method strategies, the functional approach is cleaner. For strategies with multiple methods, state, or complex logic, a full strategy class is still appropriate. In interviews, mentioning both OOP and functional implementations demonstrates versatility.`
      }
    ],

    codeExample: `# Python — Strategy pattern for payment processing
from abc import ABC, abstractmethod

class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float) -> str:
        pass

class CreditCardPayment(PaymentStrategy):
    def __init__(self, card_number: str):
        self.card_number = card_number

    def pay(self, amount: float) -> str:
        return "Charged %.2f to card ending %s" % (amount, self.card_number[-4:])

class PayPalPayment(PaymentStrategy):
    def __init__(self, email: str):
        self.email = email

    def pay(self, amount: float) -> str:
        return "Paid %.2f via PayPal (%s)" % (amount, self.email)

class CryptoPayment(PaymentStrategy):
    def __init__(self, wallet: str):
        self.wallet = wallet

    def pay(self, amount: float) -> str:
        return "Sent %.2f in crypto to %s..." % (amount, self.wallet[:8])

class ShoppingCart:
    """Context that uses a payment strategy."""
    def __init__(self):
        self.items = []
        self._strategy: PaymentStrategy = None

    def set_payment_strategy(self, strategy: PaymentStrategy):
        self._strategy = strategy

    def add_item(self, name: str, price: float):
        self.items.append({"name": name, "price": price})

    def checkout(self) -> str:
        total = sum(item["price"] for item in self.items)
        return self._strategy.pay(total)

# Usage — swap strategy at runtime
cart = ShoppingCart()
cart.add_item("Laptop", 999.99)
cart.add_item("Mouse", 29.99)

cart.set_payment_strategy(CreditCardPayment("4111111111111234"))
print(cart.checkout())  # Charged $1029.98 to card ending 1234

cart.set_payment_strategy(PayPalPayment("user@example.com"))
print(cart.checkout())  # Paid $1029.98 via PayPal

# Functional approach — same intent, lighter syntax
strategies = {
    "credit": lambda amt: "Charged %.2f to card" % amt,
    "paypal": lambda amt: "PayPal %.2f" % amt,
    "crypto": lambda amt: "Crypto %.2f" % amt,
}
print(strategies["paypal"](1029.98))`,

    tips: [
      'Use Strategy when you have multiple algorithms for the same task and want to switch between them',
      'In languages with first-class functions, lambdas are a lightweight alternative to strategy classes',
      'The Context should not know which concrete strategy it is using; it works through the interface',
      'Strategy removes conditional logic (switch/if-else on algorithm type) from the Context class',
      'In interviews, sorting comparators and payment processors are the most relatable examples'
    ],

    sampleQuestions: [
      'Implement a Strategy pattern for a pricing system with different discount algorithms',
      'How does the Strategy pattern eliminate conditional algorithm selection?',
      'When would you use Strategy vs Template Method?',
      'How do Java Comparators relate to the Strategy pattern?',
      'Design a file compression system using the Strategy pattern'
    ]
  },
  {
    id: 'command',
    title: 'Command Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 6,
    description: 'Encapsulate a request as an object, enabling undo, queuing, and logging.',

    introduction: `The Command pattern turns a request or action into a standalone object that contains all information needed to perform the action. This encapsulation allows you to parameterize methods with different requests, queue or log requests, and support undoable operations. The request is no longer a direct method call; it is a first-class object that can be stored, passed, and manipulated.

Consider a text editor. Every action (type character, delete, bold, italic, paste) is encapsulated as a Command object. Each command knows how to execute itself and how to undo itself. When the user types "Hello" and bolds it, the editor pushes TypeCommand("H"), TypeCommand("e"), TypeCommand("l"), TypeCommand("l"), TypeCommand("o"), and BoldCommand onto a command stack. Pressing Ctrl+Z pops the last command and calls undo(). This gives you unlimited undo/redo with minimal effort.

Command decouples the invoker (the button, menu item, or keyboard shortcut that triggers the action) from the receiver (the object that performs the actual work). The button does not know what happens when clicked; it just calls command.execute(). This means the same command can be triggered from a menu, toolbar, keyboard shortcut, or automation script.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Command pattern?',
        answer: `Five participants: Command is the interface with execute() and optionally undo() methods. ConcreteCommand implements Command, holding a reference to the Receiver and the parameters for the action. Receiver is the object that performs the actual work (Document, Account, Light). Invoker triggers the command (Button, MenuItem, Scheduler). Client creates the command and associates it with a receiver and invoker.

The flow: the client creates a CopyCommand targeting a Document, binds it to the toolbar Copy button (invoker), and when the button is clicked, it calls command.execute(), which calls document.copy(). The invoker is completely decoupled from the receiver; you can rebind buttons to different commands at runtime.`
      },
      {
        question: 'How do you implement undo/redo with the Command pattern?',
        answer: `Each command must implement both execute() and undo() methods. execute() performs the action and saves enough state to reverse it. undo() reverses the action using the saved state. A TypeCommand("H") inserts "H" at the cursor position during execute() and removes the character at that position during undo().

The application maintains two stacks: an undo stack and a redo stack. When a command executes, it is pushed onto the undo stack and the redo stack is cleared (because new actions invalidate the redo history). When the user undoes, the top command is popped from the undo stack, undo() is called, and the command is pushed onto the redo stack. Redo pops from the redo stack, calls execute() again, and pushes back onto the undo stack. This gives complete undo/redo with minimal code.`
      },
      {
        question: 'What are real-world applications of the Command pattern?',
        answer: `GUI frameworks: buttons, menus, and keyboard shortcuts are all invokers that trigger command objects. This is why toolbar buttons and menu items for the same action (Copy, Paste) work identically. Transaction systems: database transactions encapsulate a set of operations as a command. If any step fails, the undo (rollback) reverses all previous steps.

Job queues and task schedulers: each job is a command object placed in a queue. Workers pick commands from the queue and execute them. Failed commands can be retried, logged, or dead-lettered. Macro recording: a macro is a list of commands. Playing a macro executes each command in sequence. Smart home automation: "Turn on lights, set thermostat to 72, lock doors" is a composite command. Each action is a command that can be undone individually.`
      }
    ],

    tips: [
      'For undo support, the command must capture enough state in execute() to reverse the action in undo()',
      'Use the Composite pattern to create macro commands (a command that executes a list of sub-commands)',
      'Commands make great queue and log entries because they are self-contained, serializable objects',
      'The Invoker should not know anything about the Receiver; it only knows the Command interface',
      'In interviews, the text editor undo/redo scenario is the most compelling demonstration'
    ],

    sampleQuestions: [
      'Implement undo/redo for a text editor using the Command pattern',
      'How does the Command pattern decouple the GUI from business logic?',
      'Design a job queue system using the Command pattern',
      'What is a macro command and how does it relate to the Composite pattern?',
      'How does the Command pattern support transaction rollback?'
    ]
  },
  {
    id: 'state-pattern',
    title: 'State Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 6,
    description: 'Allow an object to alter its behavior when its internal state changes.',

    introduction: `The State pattern allows an object to change its behavior when its internal state changes, appearing to change its class. Instead of implementing state-dependent behavior with large conditional blocks (if state == A, do X; if state == B, do Y), each state is encapsulated in its own class, and the object delegates behavior to its current state object.

Consider a vending machine. Its behavior depends on its state: when idle, inserting money transitions to "has money" state; when has money, selecting a product dispenses it and transitions to "dispensing" state; when dispensing, taking the product transitions back to "idle." Without the State pattern, every method has conditionals checking the current state. With the State pattern, each state (IdleState, HasMoneyState, DispensingState) implements the VendingMachineState interface, and the vending machine delegates all behavior to the current state object.

The State pattern eliminates complex conditional logic and makes adding new states straightforward. When you add a "maintenance" state, you create a MaintenanceState class; existing states are unmodified. Each state class is small, focused, and testable in isolation. The state transitions become explicit: each state method returns or sets the next state.`,

    keyQuestions: [
      {
        question: 'What is the structure of the State pattern?',
        answer: `Three participants: Context is the object whose behavior changes based on state (VendingMachine). It holds a reference to the current State object and delegates behavior to it. State is the interface declaring methods for state-dependent behavior (insertMoney(), selectProduct(), dispense()). ConcreteState classes implement the State interface with behavior specific to that state (IdleState, HasMoneyState, DispensingState).

State transitions can be managed by the states themselves (each state method sets the context's new state) or by the context (a state method returns the next state, and the context applies it). State-managed transitions are simpler but can create dependencies between state classes. Context-managed transitions keep states independent but add logic to the context. Choose based on complexity.`
      },
      {
        question: 'How does the State pattern differ from the Strategy pattern?',
        answer: `State and Strategy are structurally identical: both use composition to delegate to an interchangeable object through an interface. The difference is semantic. In Strategy, the client explicitly chooses and sets the algorithm. The strategy does not know about other strategies or about switching. In State, the transitions are part of the pattern; each state may trigger a transition to another state automatically.

Strategy is about choosing HOW to do something (which algorithm). State is about WHERE the object is in its lifecycle (which state). Strategy changes are driven by the client; state changes are driven by the object's internal logic. A Strategy object is typically set once; a State object changes frequently as the context moves through its lifecycle. If behavior changes are triggered externally, it is Strategy. If behavior changes are triggered by the object's own actions, it is State.`
      },
      {
        question: 'How do you handle state transitions cleanly?',
        answer: `The cleanest approach is to have state methods return the next state object: IdleState.insertMoney() performs the idle-specific logic and returns new HasMoneyState(). The context calls currentState = currentState.insertMoney(amount). This makes transitions explicit and visible in the code.

For complex transition rules, a transition table can map (currentState, event) to nextState. This centralizes transition logic and makes it easy to visualize the entire state machine. Some frameworks support state machine DSLs that define states, events, and transitions declaratively. Entry and exit actions (code that runs when entering or leaving a state) can be placed in the State class's enter() and exit() methods, called by the context during transitions. This mirrors UML state diagram entry/exit actions.`
      }
    ],

    tips: [
      'Each state class should be small and focused on the behavior for that one state',
      'Make state transitions explicit; do not bury them in deeply nested conditional logic',
      'Consider a transition table for complex state machines with many states and events',
      'State classes can be stateless singletons if they do not hold per-context data',
      'In interviews, the vending machine and elevator are the most common State pattern examples'
    ],

    sampleQuestions: [
      'Implement a State pattern for a media player (playing, paused, stopped)',
      'How does the State pattern simplify a vending machine implementation?',
      'What is the difference between State and Strategy patterns?',
      'How do you test individual state classes?',
      'Design a state machine for an order lifecycle using the State pattern'
    ]
  },
  {
    id: 'template-method',
    title: 'Template Method Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 5,
    description: 'Define the skeleton of an algorithm in a base class, letting subclasses override specific steps.',

    introduction: `The Template Method pattern defines the skeleton of an algorithm in a base class method and lets subclasses override specific steps without changing the overall structure. The template method defines the order of steps; subclasses customize the individual steps. This is the Hollywood Principle: "Don't call us; we'll call you." The framework calls the subclass's overridden methods at the right time.

Consider a data mining application that processes CSV files, JSON files, and databases. The overall process is the same: open the data source, extract raw data, parse it into a standard format, analyze it, generate a report, and close the source. A DataMiner base class defines this sequence as a template method: mine(). The steps openSource(), extractData(), parseData() are abstract and overridden by CSVMiner, JSONMiner, and DatabaseMiner. The steps analyze() and generateReport() are concrete in the base class because they are the same for all formats.

Template Method is inheritance-based, which makes it simpler but less flexible than Strategy (composition-based). It is ideal when algorithms share a fixed structure but differ in specific steps, and when you want to enforce the step order so that subclasses cannot rearrange the algorithm.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Template Method pattern?',
        answer: `AbstractClass: defines the template method and declares abstract methods for the customizable steps. The template method calls the steps in a fixed order. It should be declared final (Java) or non-virtual (C++) to prevent subclasses from overriding the entire algorithm.

ConcreteClass: extends AbstractClass and implements the abstract steps with specific behavior. It cannot change the order of steps, only the implementation of individual steps. Hook methods are optional steps with a default implementation (often empty) that subclasses can optionally override. For example, a hook beforeAnalyze() is called before analyze() and does nothing by default, but a subclass can override it to add pre-processing.`
      },
      {
        question: 'How does Template Method differ from Strategy?',
        answer: `Template Method uses inheritance: the algorithm skeleton is in the base class, and subclasses override steps. The step order is fixed by the base class. Strategy uses composition: the entire algorithm is in a separate object, and the context delegates to it. The algorithm can be swapped at runtime.

Template Method is appropriate when algorithms share a common structure and differ only in specific steps. Strategy is appropriate when algorithms are completely different and need to be interchangeable. Template Method enforces a step order; Strategy does not. Template Method is simpler (no extra classes) but less flexible (inheritance binds at compile time). Strategy is more flexible (runtime swapping) but adds more classes. Use Template Method when the invariant structure matters; use Strategy when the interchangeability matters.`
      },
      {
        question: 'What are hook methods and why are they useful?',
        answer: `Hook methods are optional steps in the template method with a default (usually empty) implementation. Subclasses may override them but are not required to. They provide extension points without forcing every subclass to implement unnecessary logic.

Example: a template method for processing web requests might have steps: authenticate(), authorize(), handleRequest(), logRequest(). handleRequest() is abstract (every subclass must implement it). logRequest() is a hook with a default implementation that logs to stdout; a subclass can override it to log to a file or suppress logging. authenticate() might be a hook that does nothing by default, allowing unauthenticated endpoints to skip it while authenticated endpoints override it. Hooks provide the right balance between required customization and optional extension.`
      }
    ],

    tips: [
      'Mark the template method as final/non-virtual to prevent subclasses from overriding the algorithm structure',
      'Use abstract methods for required steps and hook methods for optional steps',
      'Keep the number of abstract steps small (3-5); too many makes subclassing burdensome',
      'Prefer Strategy when you need runtime algorithm switching; use Template Method when the structure must be fixed',
      'In interviews, the document processing example (CSV, JSON, XML sharing parse-analyze-report steps) is clear and relatable'
    ],

    sampleQuestions: [
      'Implement a Template Method for a data processing pipeline',
      'What is the Hollywood Principle and how does it relate to Template Method?',
      'How do hook methods differ from abstract methods?',
      'When would you refactor a Template Method into a Strategy?',
      'Design a Template Method for a game loop (initialize, update, render, cleanup)'
    ]
  },
  {
    id: 'visitor',
    title: 'Visitor Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 5,
    description: 'Add new operations to existing object structures without modifying them.',

    introduction: `The Visitor pattern lets you define a new operation on a set of classes without modifying those classes. Instead of adding a new method to every class in a hierarchy, you create a visitor object that implements the operation for each class type. The existing classes accept the visitor, and the visitor performs the operation based on the specific type.

Consider a compiler that has an AST (Abstract Syntax Tree) with node types: NumberNode, BinaryOperationNode, FunctionCallNode. You need operations like evaluation, pretty-printing, type-checking, and optimization. Without Visitor, every new operation means adding a method to every node class. With Visitor, each operation is a visitor: EvaluationVisitor, PrintVisitor, TypeCheckVisitor. Each visitor has a visit method for each node type. The node classes have a single accept(visitor) method that calls visitor.visit(this), dispatching to the correct overload.

Visitor achieves "double dispatch": the operation performed depends on both the visitor type and the element type. This is useful when the object structure is stable (node types rarely change) but operations change frequently (new analyses, new transformations). The trade-off is that adding a new node type requires modifying all existing visitors, which is why Visitor works best with stable class hierarchies.`,

    keyQuestions: [
      {
        question: 'What is double dispatch and why does Visitor need it?',
        answer: `Most OOP languages support single dispatch: the method called depends on the runtime type of the object. When you call node.evaluate(), polymorphism selects the correct evaluate() based on the node type. But what if you want the operation to depend on TWO types: the node type AND the operation type?

Single dispatch cannot do this directly. Visitor achieves double dispatch through a two-step process: first, the client calls element.accept(visitor), which dispatches based on the element's type (first dispatch). Inside accept(), the element calls visitor.visitSpecificType(this), which dispatches based on the visitor's type (second dispatch). The combined result is that the correct operation for the correct element type is called, without any conditional logic or instanceof checks.`
      },
      {
        question: 'When should you use the Visitor pattern?',
        answer: `Use Visitor when: the object structure is stable (types rarely added or removed) but you frequently need to add new operations. Compilers, interpreters, document processors, and report generators fit this profile because the node/element types are fixed by a specification, but new analyses and transformations are added regularly.

Avoid Visitor when: the class hierarchy changes frequently (each new class requires modifying every visitor). When the operations are simple enough that adding a method to each class is easier than creating a visitor infrastructure. When the object structure is not a well-defined, closed set. Also avoid it when elements need to hide their internals: Visitor requires elements to expose enough information for visitors to operate, which can break encapsulation.`
      },
      {
        question: 'What are the drawbacks of the Visitor pattern?',
        answer: `Adding a new element type is expensive: you must add a new visit method to the Visitor interface and implement it in every ConcreteVisitor. This is the opposite trade-off of adding methods directly to element classes. Visitor trades easy addition of operations for hard addition of types; methods on classes trade easy addition of types for hard addition of operations. This is known as the Expression Problem.

Visitors can also break encapsulation: they need access to element internals to perform their operations. The double-dispatch mechanism (accept/visit) can be confusing to developers unfamiliar with the pattern. In languages with pattern matching (Kotlin, Scala, Rust), you can achieve the same effect more concisely with match/when expressions, reducing the need for the full Visitor pattern.`
      }
    ],

    tips: [
      'Use Visitor when you have a stable type hierarchy and frequently add new operations',
      'The accept() method in each element is always the same pattern: visitor.visitMyType(this)',
      'Consider pattern matching (Kotlin when, Scala match) as a simpler alternative when available',
      'Visitor is common in compilers, interpreters, and document processing systems',
      'In interviews, the AST example is the most compelling use case for Visitor'
    ],

    sampleQuestions: [
      'Implement a Visitor for evaluating and pretty-printing an expression tree',
      'What is the Expression Problem and how does Visitor relate to it?',
      'Explain double dispatch and why it requires two method calls',
      'When would you choose Visitor over adding methods directly to element classes?',
      'How do modern language features like pattern matching reduce the need for Visitor?'
    ]
  },
  {
    id: 'mediator',
    title: 'Mediator Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 5,
    description: 'Define an object that encapsulates how a set of objects interact.',

    introduction: `The Mediator pattern reduces chaotic many-to-many dependencies between objects by introducing a central mediator object that handles all communication. Instead of objects referring to each other directly, they communicate through the mediator. This turns a complex web of interconnections into a simple star topology.

Think of an air traffic control tower. Without it, every airplane would need to communicate with every other airplane to coordinate landing, takeoff, and altitude. With hundreds of planes, this would be thousands of connections and guaranteed chaos. The control tower (mediator) centralizes communication: each plane talks only to the tower, and the tower coordinates all interactions.

In software, Mediator is common in GUI frameworks (a dialog mediator coordinates interactions between text fields, checkboxes, and buttons), chat rooms (the chat server mediates messages between users), and workflow engines (a coordinator manages step-to-step transitions). The pattern reduces coupling between components but centralizes control in the mediator, which can become a God object if not carefully managed.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Mediator pattern?',
        answer: `Mediator: an interface declaring methods for communication between colleagues (notify, send, etc.). ConcreteMediator: implements the Mediator interface, holding references to all colleague objects and implementing the coordination logic. Colleague: a base class for objects that interact through the mediator. Each colleague holds a reference to the mediator. ConcreteColleague: specific colleagues that communicate through the mediator rather than directly with each other.

When a colleague needs to communicate, it calls mediator.notify(this, event). The mediator examines the event and the sender, then invokes the appropriate methods on other colleagues. The colleagues never reference each other directly; they only know about the mediator. This decoupling means colleagues can be added, removed, or modified independently.`
      },
      {
        question: 'How is Mediator different from Observer?',
        answer: `Both patterns decouple communication between objects. Observer establishes a one-to-many relationship: one subject notifies many observers. The subject does not direct the communication to specific observers; all observers receive the same notification. Mediator establishes many-to-many relationships with directed communication: the mediator receives notifications from any colleague and routes them to specific other colleagues.

Observer is passive: the subject broadcasts, and observers decide what to do. Mediator is active: it receives events and decides which colleagues to notify and how. Observer is best for broadcasting state changes. Mediator is best for coordinating complex interactions where different events require notifying different participants. A chat room is a Mediator: when user A sends a message, the server decides which users (those in the same room) receive it. A stock ticker is an Observer: when the price changes, all subscribers are notified identically.`
      },
      {
        question: 'When does a Mediator become a God object?',
        answer: `A Mediator risks becoming a God object when it accumulates too much logic. If the mediator handles business validation, data transformation, error handling, and workflow logic in addition to routing communication, it has taken on too many responsibilities.

To prevent this, keep the mediator focused on coordination (routing messages between colleagues) and delegate actual work to the colleagues or to services. If the mediator grows too large, split it into multiple mediators, each handling a subset of interactions. Alternatively, use an event bus or message broker (a generic mediator) that routes events without understanding their content, keeping specific logic in event handlers. In interviews, mention the God object risk proactively to show design maturity.`
      }
    ],

    tips: [
      'Use Mediator when many objects have complex, tangled interdependencies',
      'Keep the mediator focused on coordination; delegate business logic to colleagues or services',
      'If the mediator grows too large, split it into multiple smaller mediators',
      'Mediator replaces many-to-many relationships with a star topology through a central hub',
      'In interviews, the chat room and air traffic control tower are the clearest analogies'
    ],

    sampleQuestions: [
      'Design a Mediator for a chat room system',
      'How does the Mediator pattern reduce coupling between UI components?',
      'What is the difference between Mediator and Facade?',
      'When does a Mediator become an anti-pattern?',
      'Implement a Mediator for coordinating form validation between multiple fields'
    ]
  },
  {
    id: 'memento',
    title: 'Memento Pattern',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 5,
    description: 'Capture and restore an object\'s internal state without violating encapsulation.',

    introduction: `The Memento pattern lets you capture a snapshot of an object's internal state so that the object can be restored to that state later, without exposing its internal structure. The snapshot is stored in a separate Memento object that is opaque to external code. Only the originator (the object whose state is captured) can create and restore from mementos.

Think of a video game save system. When you save, the game captures the player's position, health, inventory, quest progress, and world state into a save file (memento). When you load, the game restores all these values from the save file. The save file does not expose game internals to the file system; it is a black box that only the game engine can interpret.

Memento is closely related to the Command pattern for implementing undo/redo. While Command stores the action performed (and how to reverse it), Memento stores the complete state before the action. Command-based undo is more efficient (stores only the delta), but Memento-based undo is simpler and more reliable (no need to figure out how to reverse each action). In practice, systems often combine both approaches.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Memento pattern?',
        answer: `Three participants: Originator is the object whose state needs to be saved and restored (TextEditor, GameCharacter). It creates a Memento containing a snapshot of its current state and can restore itself from a Memento. Memento is an opaque object that stores the originator's state. It should be immutable and should not expose the state to anyone other than the originator. Caretaker manages the collection of mementos (undo stack, save file list) without examining or modifying their contents.

In Java, Memento can be an inner class of Originator with package-private or private access to its fields. In Python, the memento is typically a dictionary or a frozen dataclass. The caretaker stores mementos but treats them as opaque objects, only passing them back to the originator for restoration.`
      },
      {
        question: 'How do you implement Memento without violating encapsulation?',
        answer: `The challenge is that the Memento must contain the originator's private state, but external code (the caretaker) should not be able to access it. In Java, make the Memento a static inner class of the Originator with private fields. The Originator can access the inner class's private fields. The Caretaker holds the Memento but cannot access its contents.

In Python, encapsulation is by convention. Use a frozen dataclass or namedtuple for the Memento with attributes prefixed by underscore. Or use pickle/copy.deepcopy to create an opaque binary snapshot. In C++, make the Originator a friend of the Memento class. The key principle is that the Memento is a "wide interface" to the Originator (full state access) and a "narrow interface" to everyone else (no access to stored state).`
      },
      {
        question: 'What are the trade-offs of Memento vs Command for undo?',
        answer: `Memento-based undo stores a complete state snapshot before each action. Undo means replacing the current state with the saved snapshot. This is simple, reliable, and works for any action without needing to know how to reverse it. The downside is memory: storing complete state for every action can be expensive for large states.

Command-based undo stores the action performed and its inverse. Undo means executing the inverse operation. This is memory-efficient (only stores the delta) but requires every command to implement a correct undo() method, which can be complex for some operations. A hybrid approach stores complete snapshots at checkpoints and commands between checkpoints. To undo multiple steps, restore the nearest checkpoint and replay commands forward to the desired point.`
      }
    ],

    tips: [
      'Keep the Memento opaque: only the Originator should read its contents',
      'Be mindful of memory usage when storing many mementos of large state objects',
      'Use deep copy when creating mementos to avoid shared references between the memento and the originator',
      'Combine Memento with Command for efficient undo: snapshots at checkpoints, commands between them',
      'In interviews, the text editor and game save system are the standard examples'
    ],

    sampleQuestions: [
      'Implement a Memento-based undo system for a text editor',
      'How does the Memento pattern preserve encapsulation?',
      'Compare Memento vs Command pattern for implementing undo',
      'What memory optimization strategies exist for Memento-heavy systems?',
      'Design a save/load system for a game using the Memento pattern'
    ]
  },
  {
    id: 'chain-of-responsibility',
    title: 'Chain of Responsibility',
    icon: 'gitBranch',
    color: '#ef4444',
    questions: 6,
    description: 'Pass a request along a chain of handlers until one handles it.',

    introduction: `The Chain of Responsibility pattern passes a request sequentially through a chain of handler objects. Each handler decides either to process the request or to pass it to the next handler in the chain. The sender does not know which handler will process the request, and each handler does not need to know the full chain structure. This decouples request senders from receivers.

Consider a customer support system. When a ticket is submitted, it goes to Level 1 support. If they cannot resolve it, it escalates to Level 2. If Level 2 cannot resolve it, it escalates to Level 3. Each support level is a handler in the chain. The customer does not know or care which level handles their issue; they just submit the ticket.

The pattern is widespread in software. HTTP middleware stacks (authentication, logging, compression, routing) are chains where each middleware processes or passes the request. Exception handling (catch blocks try matching the exception type in order), DOM event bubbling (events propagate from child to parent elements), and approval workflows (amount-based approvals escalating through management hierarchy) all use this pattern.`,

    keyQuestions: [
      {
        question: 'What is the structure of the Chain of Responsibility?',
        answer: `Handler: an interface with a method to handle requests (handle(request)) and a method or field to set the next handler (setNext(handler)). ConcreteHandler: implements Handler, examines the request, and either processes it or delegates to the next handler. Client: creates the chain by linking handlers and sends the request to the first handler.

The chain is typically assembled during initialization: handler1.setNext(handler2); handler2.setNext(handler3). The client calls handler1.handle(request). Handler1 checks if it can process the request; if so, it processes it and optionally stops the chain. If not, it calls next.handle(request). The request propagates until a handler processes it or the chain ends.`
      },
      {
        question: 'What is the difference between a chain that stops on first handler vs a chain that lets all handlers process?',
        answer: `In the classic Chain of Responsibility, a request is handled by exactly one handler: the first one capable of handling it. The request stops propagating when handled. This is the "find the right handler" variant. Example: exception handling, where the first matching catch block handles the exception.

In the variant sometimes called "pipeline" or "middleware chain," every handler processes the request and passes it along. The request flows through the entire chain. Each handler adds its contribution (logging, authentication, compression). HTTP middleware stacks use this variant. Both are valid; the choice depends on whether you need "the right handler" (classic) or "all handlers in sequence" (pipeline). In the pipeline variant, handlers typically call next.handle() first (to process the request in order) and may inspect or modify the response on the way back.`
      },
      {
        question: 'How does Chain of Responsibility relate to HTTP middleware?',
        answer: `HTTP middleware is a direct application of Chain of Responsibility. Each middleware function receives the request and a "next" callback. It can inspect/modify the request, call next() to pass to the next middleware, and inspect/modify the response on the way back.

In Express.js: app.use(logging, auth, rateLimit, cors, router). Each middleware calls next() to pass the request along. Auth middleware might reject the request (stopping the chain) or call next() to continue. This is the pipeline variant: the request flows through all middleware, and the response flows back through them in reverse order. This "onion model" (Koa) or "middleware stack" (Express, Django, ASP.NET) is one of the most common architectural patterns in web development, and recognizing it as Chain of Responsibility helps you design and debug middleware correctly.`
      }
    ],

    tips: [
      'Ensure the chain has a fallback: a final handler that logs or returns an error if no handler processes the request',
      'Keep each handler focused on one type of processing; do not let handlers grow into "do everything" classes',
      'The chain order matters: place common handlers early and specialized handlers later',
      'Consider the pipeline variant (all handlers process) vs the classic variant (first match wins) based on your needs',
      'In interviews, HTTP middleware and approval workflows are the most relatable examples'
    ],

    sampleQuestions: [
      'Design a Chain of Responsibility for a logging system with different severity levels',
      'How is HTTP middleware an example of Chain of Responsibility?',
      'Implement an approval workflow where different managers approve different amounts',
      'What happens if no handler in the chain can process the request?',
      'Compare Chain of Responsibility with the Strategy pattern'
    ]
  },
];

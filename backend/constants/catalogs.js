/**
 * GeoConnect Centralized Standardized Catalogs
 * Defines stable unique IDs, canonical display names, categories, and unambiguous aliases
 * for Technical Skills, Research Interests, and Professional Domains.
 */

const TECHNICAL_SKILLS = [
  // Programming Languages
  {
    id: 'skill-python',
    name: 'Python',
    category: 'Programming Languages',
    aliases: ['py', 'python3', 'python 3', 'cpython']
  },
  {
    id: 'skill-javascript',
    name: 'JavaScript',
    category: 'Programming Languages',
    aliases: ['js', 'es6', 'es2020', 'vanilla js', 'ecmascript']
  },
  {
    id: 'skill-typescript',
    name: 'TypeScript',
    category: 'Programming Languages',
    aliases: ['ts', 'typescriptlang']
  },
  {
    id: 'skill-cpp',
    name: 'C++',
    category: 'Programming Languages',
    aliases: ['cpp', 'c plus plus', 'cplusplus', 'c++17', 'c++20']
  },
  {
    id: 'skill-c',
    name: 'C',
    category: 'Programming Languages',
    aliases: ['c language', 'ansi c']
  },
  {
    id: 'skill-java',
    name: 'Java',
    category: 'Programming Languages',
    aliases: ['java8', 'java11', 'java17', 'jvm']
  },
  {
    id: 'skill-golang',
    name: 'Go',
    category: 'Programming Languages',
    aliases: ['golang', 'go lang', 'go-lang']
  },
  {
    id: 'skill-rust',
    name: 'Rust',
    category: 'Programming Languages',
    aliases: ['rustlang', 'rust-lang']
  },
  {
    id: 'skill-r',
    name: 'R',
    category: 'Programming Languages',
    aliases: ['r language', 'rlang', 'r-lang', 'rstats']
  },
  {
    id: 'skill-julia',
    name: 'Julia',
    category: 'Programming Languages',
    aliases: ['julialang', 'julia-lang']
  },
  {
    id: 'skill-matlab',
    name: 'MATLAB',
    category: 'Programming Languages',
    aliases: ['matlab/simulink', 'simulink']
  },
  {
    id: 'skill-sql',
    name: 'SQL',
    category: 'Databases & Query Languages',
    aliases: ['structured query language', 'ansi sql', 't-sql', 'pl/sql']
  },

  // Frontend & Mobile Frameworks
  {
    id: 'skill-react-native',
    name: 'React Native',
    category: 'Frontend & Mobile',
    aliases: ['rn', 'react-native', 'expo', 'reactnative']
  },
  {
    id: 'skill-react',
    name: 'React',
    category: 'Frontend & Mobile',
    aliases: ['reactjs', 'react.js', 'react js']
  },
  {
    id: 'skill-flutter',
    name: 'Flutter',
    category: 'Frontend & Mobile',
    aliases: ['flutter sdk', 'dart flutter']
  },
  {
    id: 'skill-swift',
    name: 'Swift',
    category: 'Frontend & Mobile',
    aliases: ['swiftui', 'ios swift', 'apple swift']
  },
  {
    id: 'skill-kotlin',
    name: 'Kotlin',
    category: 'Frontend & Mobile',
    aliases: ['android kotlin', 'kotlin multiplatform', 'kmp']
  },

  // Backend & APIs
  {
    id: 'skill-nodejs',
    name: 'Node.js',
    category: 'Backend & APIs',
    aliases: ['node', 'nodejs', 'node.js', 'express', 'expressjs', 'express.js']
  },
  {
    id: 'skill-django',
    name: 'Django',
    category: 'Backend & APIs',
    aliases: ['django rest framework', 'drf', 'python django']
  },
  {
    id: 'skill-fastapi',
    name: 'FastAPI',
    category: 'Backend & APIs',
    aliases: ['fast-api', 'fast api', 'python fastapi']
  },
  {
    id: 'skill-graphql',
    name: 'GraphQL',
    category: 'Backend & APIs',
    aliases: ['gql', 'apollo graphql']
  },
  {
    id: 'skill-socketio',
    name: 'Socket.io',
    category: 'Backend & APIs',
    aliases: ['socket.io', 'socketio', 'websockets', 'web sockets']
  },

  // AI, Data Science & Machine Learning Tools
  {
    id: 'skill-pytorch',
    name: 'PyTorch',
    category: 'AI & Data Science',
    aliases: ['pytorch', 'torch', 'py-torch', 'torchvision', 'torchaudio']
  },
  {
    id: 'skill-tensorflow',
    name: 'TensorFlow',
    category: 'AI & Data Science',
    aliases: ['tf', 'tensorflow', 'tensor flow', 'tf2', 'keras']
  },
  {
    id: 'skill-scikit-learn',
    name: 'Scikit-Learn',
    category: 'AI & Data Science',
    aliases: ['sklearn', 'scikit learn', 'scikit-learn', 'scikit']
  },
  {
    id: 'skill-pandas',
    name: 'Pandas',
    category: 'AI & Data Science',
    aliases: ['python pandas', 'pd']
  },
  {
    id: 'skill-numpy',
    name: 'NumPy',
    category: 'AI & Data Science',
    aliases: ['numpy', 'np', 'python numpy']
  },
  {
    id: 'skill-huggingface',
    name: 'Hugging Face Transformers',
    category: 'AI & Data Science',
    aliases: ['transformers', 'huggingface', 'hf', 'hugging face']
  },
  {
    id: 'skill-opencv',
    name: 'OpenCV',
    category: 'AI & Data Science',
    aliases: ['cv2', 'open cv', 'opencv-python']
  },
  {
    id: 'skill-cuda',
    name: 'CUDA',
    category: 'AI & Data Science',
    aliases: ['nvidia cuda', 'cuda c++', 'gpu computing']
  },
  {
    id: 'skill-jax',
    name: 'JAX',
    category: 'AI & Data Science',
    aliases: ['google jax', 'jax/flax', 'flax']
  },

  // Databases & Cloud Infrastructure
  {
    id: 'skill-mongodb',
    name: 'MongoDB',
    category: 'Databases & Infrastructure',
    aliases: ['mongo', 'mongoose', 'mongodb atlas', 'nosql mongodb']
  },
  {
    id: 'skill-postgresql',
    name: 'PostgreSQL',
    category: 'Databases & Infrastructure',
    aliases: ['postgres', 'pgsql', 'psql']
  },
  {
    id: 'skill-redis',
    name: 'Redis',
    category: 'Databases & Infrastructure',
    aliases: ['redis-cache', 'redis cache', 'in-memory db']
  },
  {
    id: 'skill-docker',
    name: 'Docker',
    category: 'Databases & Infrastructure',
    aliases: ['docker-compose', 'containerization', 'containers']
  },
  {
    id: 'skill-kubernetes',
    name: 'Kubernetes',
    category: 'Databases & Infrastructure',
    aliases: ['k8s', 'kube', 'k8s cluster']
  },
  {
    id: 'skill-git',
    name: 'Git',
    category: 'Databases & Infrastructure',
    aliases: ['github', 'gitlab', 'git version control', 'vcs']
  },
  {
    id: 'skill-aws',
    name: 'AWS',
    category: 'Databases & Infrastructure',
    aliases: ['amazon web services', 'amazon aws', 'ec2', 's3', 'aws lambda']
  },
  {
    id: 'skill-gcp',
    name: 'Google Cloud Platform',
    category: 'Databases & Infrastructure',
    aliases: ['gcp', 'google cloud', 'google cloud platform']
  },
  {
    id: 'skill-azure',
    name: 'Microsoft Azure',
    category: 'Databases & Infrastructure',
    aliases: ['azure', 'ms azure', 'azure cloud']
  },
  {
    id: 'skill-linux',
    name: 'Linux',
    category: 'Databases & Infrastructure',
    aliases: ['ubuntu', 'debian', 'bash', 'shell', 'unix']
  }
];

const RESEARCH_INTERESTS = [
  // Core AI & Modeling
  {
    id: 'interest-machine-learning',
    name: 'Machine Learning',
    category: 'Artificial Intelligence',
    aliases: ['ml', 'machine-learning', 'statistical machine learning', 'ml algorithms']
  },
  {
    id: 'interest-deep-learning',
    name: 'Deep Learning',
    category: 'Artificial Intelligence',
    aliases: ['dl', 'deep-learning', 'deep neural networks', 'dnn', 'artificial neural networks']
  },
  {
    id: 'interest-natural-language-processing',
    name: 'Natural Language Processing',
    category: 'Artificial Intelligence',
    aliases: ['nlp', 'computational linguistics', 'text mining', 'language models', 'llm', 'llms']
  },
  {
    id: 'interest-computer-vision',
    name: 'Computer Vision',
    category: 'Artificial Intelligence',
    aliases: ['cv', 'image processing', 'visual recognition', 'scene understanding', 'object detection']
  },
  {
    id: 'interest-reinforcement-learning',
    name: 'Reinforcement Learning',
    category: 'Artificial Intelligence',
    aliases: ['rl', 'reinforcement-learning', 'deep rl', 'policy gradients', 'q-learning']
  },
  {
    id: 'interest-explainable-ai',
    name: 'Explainable AI',
    category: 'Artificial Intelligence',
    aliases: ['xai', 'explainable artificial intelligence', 'interpretable ai', 'model interpretability']
  },
  {
    id: 'interest-graph-neural-networks',
    name: 'Graph Neural Networks',
    category: 'Artificial Intelligence',
    aliases: ['gnn', 'gnns', 'geometric deep learning', 'graph representation learning']
  },
  {
    id: 'interest-generative-ai',
    name: 'Generative AI',
    category: 'Artificial Intelligence',
    aliases: ['genai', 'generative models', 'diffusion models', 'gans', 'foundation models']
  },
  {
    id: 'interest-federated-learning',
    name: 'Federated Learning',
    category: 'Artificial Intelligence',
    aliases: ['privacy-preserving ml', 'fl', 'decentralized machine learning']
  },
  {
    id: 'interest-multimodal-learning',
    name: 'Multimodal Learning',
    category: 'Artificial Intelligence',
    aliases: ['multimodal ai', 'vision-language models', 'vlm', 'cross-modal learning']
  },

  // Applied & Interdisciplinary Research
  {
    id: 'interest-medical-image-analysis',
    name: 'Medical Image Analysis',
    category: 'Bio & Health Informatics',
    aliases: ['medical imaging', 'biomedical image processing', 'clinical imaging', 'radiology ai']
  },
  {
    id: 'interest-computational-biology',
    name: 'Computational Biology',
    category: 'Bio & Health Informatics',
    aliases: ['comp bio', 'bioinformatics', 'computational genomics', 'structural bioinformatics']
  },
  {
    id: 'interest-drug-discovery',
    name: 'AI in Drug Discovery',
    category: 'Bio & Health Informatics',
    aliases: ['computer-aided drug design', 'cadd', 'molecular modeling', 'cheminformatics']
  },
  {
    id: 'interest-climate-modeling',
    name: 'Climate Modeling',
    category: 'Earth & Environmental Sciences',
    aliases: ['climate informatics', 'earth system modeling', 'climate prediction', 'weather forecasting ai']
  },
  {
    id: 'interest-remote-sensing',
    name: 'Remote Sensing & GIS',
    category: 'Earth & Environmental Sciences',
    aliases: ['satellite imagery', 'gis analysis', 'geospatial analysis', 'earth observation']
  },
  {
    id: 'interest-robotics',
    name: 'Robotics & Autonomous Systems',
    category: 'Robotics & Control',
    aliases: ['robotics', 'autonomous robots', 'robot learning', 'motion planning', 'slam']
  },
  {
    id: 'interest-human-computer-interaction',
    name: 'Human-Computer Interaction',
    category: 'Human-Centered Computing',
    aliases: ['hci', 'human computer interaction', 'human-ai interaction', 'user research', 'usable security']
  },
  {
    id: 'interest-cybersecurity',
    name: 'Cybersecurity & Privacy',
    category: 'Security & Systems',
    aliases: ['infosec', 'network security', 'cryptography', 'adversarial machine learning']
  },
  {
    id: 'interest-distributed-systems',
    name: 'Distributed Systems',
    category: 'Computer Systems',
    aliases: ['distributed computing', 'cloud computing research', 'edge computing', 'p2p systems']
  },
  {
    id: 'interest-quantum-computing',
    name: 'Quantum Computing',
    category: 'Physical & Information Sciences',
    aliases: ['quantum information', 'quantum algorithms', 'quantum machine learning', 'qml']
  }
];

const RESEARCH_DOMAINS = [
  {
    id: 'domain-artificial-intelligence',
    name: 'Artificial Intelligence',
    category: 'Technology & Computing',
    aliases: ['ai', 'ai & data science', 'computer science - ai', 'machine intelligence']
  },
  {
    id: 'domain-healthcare',
    name: 'Healthcare & Medicine',
    category: 'Life & Health Sciences',
    aliases: ['healthcare', 'health', 'medicine', 'digital health', 'biomedical', 'clinical medicine']
  },
  {
    id: 'domain-biotechnology',
    name: 'Biotechnology & Life Sciences',
    category: 'Life & Health Sciences',
    aliases: ['biotechnology', 'biotech', 'life sciences', 'pharmaceuticals', 'genomics']
  },
  {
    id: 'domain-climate-science',
    name: 'Climate Science & Environment',
    category: 'Environmental & Earth Sciences',
    aliases: ['climate science', 'environment', 'environmental science', 'climate', 'earth science', 'sustainability']
  },
  {
    id: 'domain-renewable-energy',
    name: 'Renewable Energy & CleanTech',
    category: 'Energy & Infrastructure',
    aliases: ['renewable energy', 'clean energy', 'cleantech', 'solar & wind', 'smart grid']
  },
  {
    id: 'domain-education',
    name: 'Education & EdTech',
    category: 'Social Sciences & Humanities',
    aliases: ['education', 'edtech', 'educational technology', 'higher education', 'learning science']
  },
  {
    id: 'domain-finance',
    name: 'Finance & FinTech',
    category: 'Business & Economics',
    aliases: ['finance', 'fintech', 'financial services', 'banking', 'quantitative finance']
  },
  {
    id: 'domain-agriculture',
    name: 'Agriculture & AgriTech',
    category: 'Food & Natural Resources',
    aliases: ['agriculture', 'agritech', 'precision agriculture', 'smart farming', 'food systems']
  },
  {
    id: 'domain-cybersecurity',
    name: 'Cybersecurity & Defense',
    category: 'Security & Systems',
    aliases: ['cybersecurity', 'cyber defense', 'information security', 'infosec', 'national security']
  },
  {
    id: 'domain-robotics',
    name: 'Robotics & Automation',
    category: 'Engineering & Manufacturing',
    aliases: ['robotics', 'industrial automation', 'autonomous vehicles', 'mechatronics']
  },
  {
    id: 'domain-aerospace',
    name: 'Aerospace & Aviation',
    category: 'Engineering & Manufacturing',
    aliases: ['aerospace', 'aviation', 'space technology', 'satellite systems']
  },
  {
    id: 'domain-telecom',
    name: 'Telecommunications & Networking',
    category: 'Technology & Computing',
    aliases: ['telecommunications', 'telecom', '5g/6g', 'wireless networks', 'iot']
  },
  {
    id: 'domain-smart-cities',
    name: 'Smart Cities & Urban Computing',
    category: 'Urban Planning & Geospatial',
    aliases: ['smart cities', 'urban planning', 'urban computing', 'geospatial technology', 'transportation']
  },
  {
    id: 'domain-humanities',
    name: 'Digital Humanities & Social Science',
    category: 'Social Sciences & Humanities',
    aliases: ['digital humanities', 'computational social science', 'humanities', 'social science']
  }
];

module.exports = {
  TECHNICAL_SKILLS,
  RESEARCH_INTERESTS,
  RESEARCH_DOMAINS
};

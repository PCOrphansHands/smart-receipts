import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        gmailSetup: 'Gmail Setup',
        uploadReceipts: 'Upload Receipts',
        signOut: 'Sign Out',
      },
      home: {
        title: 'Smart Receipts',
        subtitle: 'Automatically process and organize your receipts',
        quickActions: {
          title: 'Quick Actions',
          checkingStatus: 'Checking connection status...',
          scanGmail: {
            title: 'Scan Gmail for Receipts',
            description: 'Automatically process email receipts from your inbox',
            connectButton: 'Connect Gmail',
            scanButton: 'Scan for Receipts',
          },
          uploadFiles: {
            title: 'Upload Receipt Files',
            description: 'Process local receipts or photos',
            button: 'Upload Files',
          },
          viewDropbox: {
            title: 'View Dropbox Folder',
            descriptionConnected: 'Access your processed receipts',
            descriptionNotConnected: 'Store processed receipts in the cloud',
            connectButton: 'Connect Dropbox',
            openButton: 'Open in Dropbox',
          },
        },
        welcome: {
          title: 'Welcome to Smart Receipts!',
          description: 'Get started by connecting your Gmail account to scan for receipts, or upload local receipt files directly.',
          setupGmailButton: 'Set up Gmail',
          uploadButton: 'Upload Files',
        },
        dashboard: {
          title: 'Dashboard',
          totalReceipts: 'Total Receipts',
          last7Days: 'Last 7 Days',
          totalSpent: 'Total Spent',
        },
        recentReceipts: {
          title: 'Recent Receipts',
          viewAll: 'View All in Dropbox',
          noReceipts: 'No receipts yet',
        },
        stats: {
          processed: 'Processed',
          pending: 'Pending',
          total: 'Total Receipts',
        },
        tabs: {
          receipts: 'Receipts',
          settings: 'Settings',
        },
        noReceipts: {
          title: 'No receipts yet',
          description: 'Connect your Gmail and Dropbox to start processing receipts',
        },
        settings: {
          gmail: {
            title: 'Gmail Connection',
            description: 'Scan incoming emails for receipts with "Receipt", "Payment", or "Purchase" in the subject',
            button: 'Connect Gmail',
          },
          dropbox: {
            title: 'Dropbox Storage',
            description: 'Upload processed receipts to your designated Dropbox folder',
            button: 'Connect Dropbox',
          },
          upload: {
            title: 'Upload Local Receipts',
            description: 'Upload receipt files directly from your computer (PDF or images)',
            button: 'Upload Receipts',
          },
          naming: {
            title: 'File Naming',
            description: 'Receipts are automatically renamed using this format:',
            example: 'Example: AMAZON_25.09.2025_89.99.pdf (spaces removed, all caps)',
          },
        },
        features: {
          gmail: {
            title: 'Gmail Integration',
            description: 'Scan your email for receipts automatically',
          },
          upload: {
            title: 'Manual Upload',
            description: 'Drag and drop receipt files to process',
          },
          dropbox: {
            title: 'Dropbox Storage',
            description: 'Organized storage in your Dropbox folder',
          },
        },
        cta: {
          getStarted: 'Get Started',
          setupGmail: 'Set Up Gmail',
          uploadFiles: 'Upload Receipts',
        },
      },
      gmailSetup: {
        title: 'Email Scan',
        subtitle: 'Scan your email for receipts and automatically process them to Dropbox',
        backButton: 'Back to Dashboard',
        gmailSection: {
          title: 'Gmail Connection',
          connected: 'Gmail Connected',
          notConnected: 'Not Connected',
          connect: 'Connect Gmail',
          disconnect: 'Disconnect',
          scanning: 'Scanning for receipts...',
          scan: 'Scan for Receipts',
        },
        scanSection: {
          title: 'Scan for Receipts',
          description: 'Find emails with "Receipt", "Payment", or "Purchase" in the subject',
          startDate: 'Start Date (optional)',
          endDate: 'End Date (optional)',
          scanButton: 'Scan Inbox for Receipts',
          scanning: 'Scanning...',
          foundReceipts: 'Found {count} Receipts',
        },
        dropboxSection: {
          title: 'Dropbox Connection',
          connected: 'Dropbox Connected',
          notConnected: 'Not Connected',
          connect: 'Connect Dropbox',
          accountName: 'Account',
          folder: 'Receipt Folder',
          folderPlaceholder: '/Smart_Receipts',
          saveFolder: 'Save Folder',
        },
        receipts: {
          title: 'Processed Receipts',
          noReceipts: 'No receipts found yet. Click "Scan for Receipts" to find email receipts.',
          processing: 'Processing',
          uploaded: 'Uploaded to Dropbox',
          failed: 'Failed',
        },
      },
      upload: {
        title: 'Upload Receipts',
        subtitle: 'Drag and drop receipt files to process and upload to Dropbox',
        dropzone: {
          drag: 'Drag & drop receipt files here',
          or: 'or',
          browse: 'Browse Files',
          support: 'Supports PDF, JPG, PNG up to 10MB each',
        },
        actions: {
          uploadAll: 'Upload All to Dropbox',
          uploading: 'Uploading...',
          clearAll: 'Clear All',
        },
        status: {
          processing: 'Processing...',
          success: 'Processed',
          error: 'Failed',
        },
        noFiles: 'No files uploaded yet',
      },
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        back: 'Back',
        backToHome: 'Back to Home',
        signOut: 'Sign Out',
      },
    },
  },
  ro: {
    translation: {
      nav: {
        home: 'Acasă',
        gmailSetup: 'Configurare Gmail',
        uploadReceipts: 'Încarcă Chitanțe',
        signOut: 'Deconectare',
      },
      home: {
        title: 'Chitanțe Inteligente',
        subtitle: 'Procesează și organizează automat chitanțele tale',
        quickActions: {
          title: 'Acțiuni Rapide',
          checkingStatus: 'Verificare status conexiune...',
          scanGmail: {
            title: 'Scanează Gmail pentru Chitanțe',
            description: 'Procesează automat chitanțele din email',
            connectButton: 'Conectează Gmail',
            scanButton: 'Scanează pentru Chitanțe',
          },
          uploadFiles: {
            title: 'Încarcă Fișiere Chitanțe',
            description: 'Procesează chitanțe locale sau fotografii',
            button: 'Încarcă Fișiere',
          },
          viewDropbox: {
            title: 'Vizualizează Folder Dropbox',
            descriptionConnected: 'Accesează chitanțele procesate',
            descriptionNotConnected: 'Stochează chitanțele procesate în cloud',
            connectButton: 'Conectează Dropbox',
            openButton: 'Deschide în Dropbox',
          },
        },
        welcome: {
          title: 'Bine ați venit la Chitanțe Inteligente!',
          description: 'Începeți prin conectarea contului Gmail pentru a scana chitanțe, sau încărcarea chitanțelor locale direct.',
          setupGmailButton: 'Configurează Gmail',
          uploadButton: 'Încarcă Fișiere',
        },
        dashboard: {
          title: 'Panou de Control',
          totalReceipts: 'Total Chitanțe',
          last7Days: 'Ultimele 7 Zile',
          totalSpent: 'Total Cheltuit',
        },
        recentReceipts: {
          title: 'Chitanțe Recente',
          viewAll: 'Vizualizează Tot în Dropbox',
          noReceipts: 'Nicio chitanță încă',
        },
        stats: {
          processed: 'Procesate',
          pending: 'În Așteptare',
          total: 'Total Chitanțe',
        },
        tabs: {
          receipts: 'Chitanțe',
          settings: 'Setări',
        },
        noReceipts: {
          title: 'Nicio chitanță încă',
          description: 'Conectează Gmail și Dropbox pentru a începe procesarea chitanțelor',
        },
        settings: {
          gmail: {
            title: 'Conexiune Gmail',
            description: 'Scanează emailurile primite pentru chitanțe cu "Chitanță", "Plată" sau "Achiziție" în subiect',
            button: 'Conectează Gmail',
          },
          dropbox: {
            title: 'Stocare Dropbox',
            description: 'Încarcă chitanțele procesate în folderul tău Dropbox desemnat',
            button: 'Conectează Dropbox',
          },
          upload: {
            title: 'Încarcă Chitanțe Locale',
            description: 'Încarcă fișiere chitanță direct de pe computer (PDF sau imagini)',
            button: 'Încarcă Chitanțe',
          },
          naming: {
            title: 'Denumire Fișiere',
            description: 'Chitanțele sunt redenumite automat folosind acest format:',
            example: 'Exemplu: AMAZON_25.09.2025_89.99.pdf (fără spații, majuscule)',
          },
        },
        features: {
          gmail: {
            title: 'Integrare Gmail',
            description: 'Scanează automat emailurile pentru chitanțe',
          },
          upload: {
            title: 'Încărcare Manuală',
            description: 'Trage și plasează fișierele de chitanță pentru procesare',
          },
          dropbox: {
            title: 'Stocare Dropbox',
            description: 'Stocare organizată în folderul tău Dropbox',
          },
        },
        cta: {
          getStarted: 'Începe',
          setupGmail: 'Configurează Gmail',
          uploadFiles: 'Încarcă Chitanțe',
        },
      },
      gmailSetup: {
        title: 'Configurare Gmail și Dropbox',
        subtitle: 'Conectează-ți conturile pentru a începe procesarea chitanțelor',
        gmailSection: {
          title: 'Conexiune Gmail',
          connected: 'Gmail Conectat',
          notConnected: 'Neconectat',
          connect: 'Conectează Gmail',
          disconnect: 'Deconectează',
          scanning: 'Scanare chitanțe...',
          scan: 'Scanează pentru Chitanțe',
        },
        scanSection: {
          title: 'Scanează pentru Chitanțe',
          description: 'Găsește emailuri cu "Chitanță", "Plată", sau "Achiziție" în subiect',
          startDate: 'Dată Început (opțional)',
          endDate: 'Dată Sfârșit (opțional)',
          scanButton: 'Scanează Inbox pentru Chitanțe',
          scanning: 'Se scanează...',
          foundReceipts: '{count} Chitanțe Găsite',
        },
        dropboxSection: {
          title: 'Conexiune Dropbox',
          connected: 'Dropbox Conectat',
          notConnected: 'Neconectat',
          connect: 'Conectează Dropbox',
          accountName: 'Cont',
          folder: 'Folder Chitanțe',
          folderPlaceholder: '/Smart_Receipts',
          saveFolder: 'Salvează Folder',
        },
        receipts: {
          title: 'Chitanțe Procesate',
          noReceipts: 'Nu s-au găsit chitanțe încă. Apasă "Scanează pentru Chitanțe" pentru a găsi chitanțe din email.',
          processing: 'Se procesează',
          uploaded: 'Încărcat în Dropbox',
          failed: 'Eșuat',
        },
      },
      upload: {
        title: 'Încarcă Chitanțe',
        subtitle: 'Trage și plasează fișierele de chitanță pentru procesare și încărcare în Dropbox',
        dropzone: {
          drag: 'Trage și plasează fișierele de chitanță aici',
          or: 'sau',
          browse: 'Răsfoiește Fișiere',
          support: 'Suportă PDF, JPG, PNG până la 10MB fiecare',
        },
        actions: {
          uploadAll: 'Încarcă Toate în Dropbox',
          uploading: 'Se încarcă...',
          clearAll: 'Șterge Toate',
        },
        status: {
          processing: 'Se procesează...',
          success: 'Procesat',
          error: 'Eșuat',
        },
        noFiles: 'Niciun fișier încărcat încă',
      },
      common: {
        loading: 'Se încarcă...',
        error: 'Eroare',
        success: 'Succes',
        cancel: 'Anulează',
        save: 'Salvează',
        delete: 'Șterge',
        back: 'Înapoi',
        backToHome: 'Înapoi la Acasă',
        signOut: 'Deconectare',
      },
    },
  },
  uk: {
    translation: {
      nav: {
        home: 'Головна',
        gmailSetup: 'Налаштування Gmail',
        uploadReceipts: 'Завантажити Чеки',
        signOut: 'Вийти',
      },
      home: {
        title: 'Розумні Чеки',
        subtitle: 'Автоматично обробляйте та організовуйте ваші чеки',
        quickActions: {
          title: 'Швидкі Дії',
          checkingStatus: 'Перевірка статусу підключення...',
          scanGmail: {
            title: 'Сканувати Gmail для Чеків',
            description: 'Автоматично обробляйте чеки з вашої пошти',
            connectButton: 'Підключити Gmail',
            scanButton: 'Сканувати Чеки',
          },
          uploadFiles: {
            title: 'Завантажити Файли Чеків',
            description: 'Обробляйте локальні чеки або фотографії',
            button: 'Завантажити Файли',
          },
          viewDropbox: {
            title: 'Переглянути Папку Dropbox',
            descriptionConnected: 'Доступ до оброблених чеків',
            descriptionNotConnected: 'Зберігайте чеки в облачному сховищі',
            connectButton: 'Підключити Dropbox',
            openButton: 'Відкрити в Dropbox',
          },
        },
        welcome: {
          title: 'Ласкаво просимо до Розумних Чеків!',
          description: 'Почніть роботу, підключивши свій обліковий запис Gmail для сканування чеків, або завантажте локальні чеки безпосередньо.',
          setupGmailButton: 'Налаштувати Gmail',
          uploadButton: 'Завантажити Файли',
        },
        dashboard: {
          title: 'Панель Керування',
          totalReceipts: 'Всього Чеків',
          last7Days: 'Останні 7 Днів',
          totalSpent: 'Всього Витрачено',
        },
        recentReceipts: {
          title: 'Останні Чеки',
          viewAll: 'Переглянути Всі в Dropbox',
          noReceipts: 'Чеків ще немає',
        },
        stats: {
          processed: 'Оброблено',
          pending: 'В Очікуванні',
          total: 'Всього Чеків',
        },
        tabs: {
          receipts: 'Чеки',
          settings: 'Налаштування',
        },
        noReceipts: {
          title: 'Чеків ще немає',
          description: 'Підключіть Gmail та Dropbox, щоб почати обробку чеків',
        },
        settings: {
          gmail: {
            title: 'Підключення Gmail',
            description: 'Скануйте вхідні листи на чеки з "Чек", "Платіж" або "Покупка" в темі',
            button: 'Підключити Gmail',
          },
          dropbox: {
            title: 'Сховище Dropbox',
            description: 'Завантажте оброблені чеки у вашу папку Dropbox',
            button: 'Підключити Dropbox',
          },
          upload: {
            title: 'Завантажити Локальні Чеки',
            description: 'Завантажте файли чеків безпосередньо з вашого комп\'ютера (PDF або зображення)',
            button: 'Завантажити Чеки',
          },
          naming: {
            title: 'Назва Файлу',
            description: 'Чеки автоматично перейменовуються за цим форматом:',
            example: 'Приклад: AMAZON_25.09.2025_89.99.pdf (без пробілів, великі літери)',
          },
        },
        features: {
          gmail: {
            title: 'Інтеграція Gmail',
            description: 'Автоматично скануйте електронну пошту на чеки',
          },
          upload: {
            title: 'Ручне Завантаження',
            description: 'Перетягніть файли чеків для обробки',
          },
          dropbox: {
            title: 'Сховище Dropbox',
            description: 'Організоване зберігання у вашій папці Dropbox',
          },
        },
        cta: {
          getStarted: 'Почати',
          setupGmail: 'Налаштувати Gmail',
          uploadFiles: 'Завантажити Чеки',
        },
      },
      gmailSetup: {
        title: 'Налаштування Gmail та Dropbox',
        subtitle: 'Підключіть свої облікові записи, щоб почати обробку чеків',
        gmailSection: {
          title: 'Підключення Gmail',
          connected: 'Gmail Підключено',
          notConnected: 'Не Підключено',
          connect: 'Підключити Gmail',
          disconnect: 'Відключити',
          scanning: 'Сканування чеків...',
          scan: 'Сканувати Чеки',
        },
        scanSection: {
          title: 'Сканувати Чеки',
          description: 'Знайти листи з "Чек", "Платіж", або "Покупка" в темі',
          startDate: 'Дата Початку (необов\'язково)',
          endDate: 'Дата Завершення (необов\'язково)',
          scanButton: 'Сканувати Вхідні для Чеків',
          scanning: 'Сканування...',
          foundReceipts: 'Знайдено {count} Чеків',
        },
        dropboxSection: {
          title: 'Підключення Dropbox',
          connected: 'Dropbox Підключено',
          notConnected: 'Не Підключено',
          connect: 'Підключити Dropbox',
          accountName: 'Обліковий запис',
          folder: 'Папка Чеків',
          folderPlaceholder: '/Smart_Receipts',
          saveFolder: 'Зберегти Папку',
        },
        receipts: {
          title: 'Оброблені Чеки',
          noReceipts: 'Чеки ще не знайдено. Натисніть "Сканувати Чеки", щоб знайти чеки в електронній пошті.',
          processing: 'Обробка',
          uploaded: 'Завантажено в Dropbox',
          failed: 'Помилка',
        },
      },
      upload: {
        title: 'Завантажити Чеки',
        subtitle: 'Перетягніть файли чеків для обробки та завантаження в Dropbox',
        dropzone: {
          drag: 'Перетягніть файли чеків сюди',
          or: 'або',
          browse: 'Вибрати Файли',
          support: 'Підтримує PDF, JPG, PNG до 10МБ кожен',
        },
        actions: {
          uploadAll: 'Завантажити Все в Dropbox',
          uploading: 'Завантаження...',
          clearAll: 'Очистити Все',
        },
        status: {
          processing: 'Обробка...',
          success: 'Оброблено',
          error: 'Помилка',
        },
        noFiles: 'Файли ще не завантажено',
      },
      common: {
        loading: 'Завантаження...',
        error: 'Помилка',
        success: 'Успіх',
        cancel: 'Скасувати',
        save: 'Зберегти',
        delete: 'Видалити',
        back: 'Назад',
        backToHome: 'Назад Додому',
        signOut: 'Вийти',
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

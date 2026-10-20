import { DTRDraftRecord, DTRAnomaly, DTRPunchPair, Employee, DTRRecord, DayType } from '../types';

/**
 * Sample Biometrics CSV Data provided by the user
 */
export const SAMPLE_BIOMETRIC_DATA_CSV = `Person ID,Person Name,Punch Date,Attendance record,Verify Type,TimeZone,Source
008,Jerome Guitguit,08/21/2026,16:41:42,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/21/2026,16:20:19,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/21/2026,16:01:47,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/21/2026,16:01:23,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/21/2026,13:03:03,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/21/2026,12:57:10,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/21/2026,12:56:08,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/21/2026,12:01:59,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/21/2026,12:00:57,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/21/2026,12:00:49,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/21/2026,08:54:06,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/21/2026,08:09:48,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/21/2026,07:47:23,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/21/2026,07:18:19,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/20/2026,21:32:40,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/20/2026,18:04:38,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/20/2026,18:00:11,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/20/2026,16:59:30,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/20/2026,16:03:16,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/20/2026,13:02:25,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/20/2026,12:58:53,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/20/2026,12:49:55,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/20/2026,12:15:24,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/20/2026,12:02:12,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/20/2026,12:01:43,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/20/2026,08:04:15,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/20/2026,07:29:43,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/19/2026,18:03:58,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/19/2026,16:06:44,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/19/2026,13:06:31,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/19/2026,13:04:35,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/19/2026,13:03:28,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/19/2026,12:44:03,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/19/2026,12:01:19,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/19/2026,12:01:04,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/19/2026,12:00:47,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/19/2026,12:00:34,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/19/2026,09:18:42,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/19/2026,09:13:21,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/19/2026,07:19:58,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/19/2026,07:15:10,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/18/2026,22:33:05,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/18/2026,21:41:36,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/18/2026,20:03:26,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/18/2026,18:43:32,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/18/2026,17:58:22,Face,+08:00,NMR2253900026
010,Raymond Ole,08/18/2026,17:23:23,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/18/2026,16:05:27,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/18/2026,13:03:02,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/18/2026,13:02:54,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/18/2026,13:00:14,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/18/2026,12:57:10,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/18/2026,12:13:35,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/18/2026,12:02:18,Face,+08:00,NMR2253900026
010,Raymond Ole,08/18/2026,12:01:00,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/18/2026,12:00:33,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/18/2026,09:24:42,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/18/2026,07:46:50,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/18/2026,07:24:53,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/17/2026,19:44:28,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/17/2026,13:58:49,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/17/2026,12:01:09,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/17/2026,07:42:43,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/15/2026,19:08:02,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/15/2026,17:05:46,Face,+08:00,NMR2253900026
010,Raymond Ole,08/15/2026,16:13:32,Face,+08:00,NMR2253900026
010,Raymond Ole,08/15/2026,16:10:58,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/15/2026,16:00:50,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/15/2026,13:10:00,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/15/2026,13:09:26,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/15/2026,13:02:51,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/15/2026,12:11:31,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/15/2026,12:04:18,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/15/2026,12:02:51,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/15/2026,12:02:31,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/15/2026,08:45:57,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/15/2026,08:02:09,Face,+08:00,NMR2253900026
010,Raymond Ole,08/15/2026,07:58:30,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/15/2026,07:41:49,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/14/2026,23:00:25,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/14/2026,20:01:51,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/14/2026,19:06:07,Face,+08:00,NMR2253900026
010,Raymond Ole,08/14/2026,19:05:33,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/14/2026,19:05:29,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/14/2026,18:44:04,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/14/2026,16:03:38,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/14/2026,14:29:40,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/14/2026,13:06:24,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/14/2026,13:04:43,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/14/2026,12:42:34,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/14/2026,12:04:34,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/14/2026,12:01:47,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/14/2026,12:01:14,Face,+08:00,NMR2253900026
010,Raymond Ole,08/14/2026,10:07:02,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/14/2026,07:39:13,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/14/2026,06:55:53,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/13/2026,20:19:44,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/13/2026,18:25:05,Face,+08:00,NMR2253900026
010,Raymond Ole,08/13/2026,17:29:17,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/13/2026,17:04:21,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/13/2026,16:02:52,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/13/2026,13:00:11,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/13/2026,12:59:56,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/13/2026,12:59:50,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/13/2026,12:46:39,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/13/2026,12:17:19,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/13/2026,12:08:14,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/13/2026,08:03:25,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/13/2026,07:22:55,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/12/2026,19:59:11,Face,+08:00,NMR2253900026
010,Raymond Ole,08/12/2026,18:42:23,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/12/2026,17:42:01,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/12/2026,17:11:58,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/12/2026,15:02:49,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/12/2026,13:05:44,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/12/2026,12:06:11,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/12/2026,12:02:13,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/12/2026,10:18:52,Face,+08:00,NMR2253900026
010,Raymond Ole,08/12/2026,09:25:39,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/12/2026,06:03:34,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/12/2026,00:00:42,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/11/2026,19:21:28,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/11/2026,19:00:54,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/11/2026,17:31:44,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/11/2026,16:04:45,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/11/2026,16:03:48,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/11/2026,13:08:55,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/11/2026,13:06:41,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/11/2026,12:58:52,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/11/2026,12:40:55,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/11/2026,12:07:37,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/11/2026,12:04:19,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/11/2026,12:04:14,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/11/2026,10:26:57,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/11/2026,09:30:58,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/11/2026,07:09:13,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/11/2026,07:06:28,Fingerprint,+08:00,NMR2253900026
010,Raymond Ole,08/10/2026,20:47:29,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/10/2026,20:46:30,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/10/2026,19:09:34,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/10/2026,16:13:49,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/10/2026,16:02:49,Face,+08:00,NMR2253900026
010,Raymond Ole,08/10/2026,14:12:30,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/10/2026,13:05:19,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/10/2026,13:05:03,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/10/2026,13:00:03,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/10/2026,12:53:49,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/10/2026,12:01:23,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/10/2026,12:01:04,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/10/2026,07:30:05,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/10/2026,07:04:46,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/09/2026,18:04:44,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/09/2026,08:57:53,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/08/2026,19:02:44,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/08/2026,17:19:22,Face,+08:00,NMR2253900026
010,Raymond Ole,08/08/2026,17:06:31,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/08/2026,15:59:45,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/08/2026,13:09:50,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/08/2026,13:03:30,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/08/2026,12:49:15,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/08/2026,12:04:07,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/08/2026,12:03:35,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/08/2026,12:03:25,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/08/2026,10:16:40,Face,+08:00,NMR2253900026
010,Raymond Ole,08/08/2026,10:05:05,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/08/2026,09:11:55,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/08/2026,07:19:08,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/07/2026,22:05:18,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/07/2026,19:30:31,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/07/2026,16:07:07,Face,+08:00,NMR2253900026
010,Raymond Ole,08/07/2026,16:01:52,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/07/2026,16:01:21,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/07/2026,13:04:14,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/07/2026,12:56:10,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/07/2026,12:54:01,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/07/2026,12:13:04,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/07/2026,12:03:07,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/07/2026,12:00:26,Face,+08:00,NMR2253900026
010,Raymond Ole,08/07/2026,11:02:24,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/07/2026,08:00:57,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/07/2026,07:38:27,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/06/2026,22:58:27,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/06/2026,21:18:10,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/06/2026,16:05:37,Face,+08:00,NMR2253900026
010,Raymond Ole,08/06/2026,16:03:21,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/06/2026,13:01:32,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/06/2026,12:47:49,Face,+08:00,NMR2253900026
010,Raymond Ole,08/06/2026,12:05:45,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/06/2026,12:03:29,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/06/2026,12:01:43,Face,+08:00,NMR2253900026
010,Raymond Ole,08/06/2026,07:23:11,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/06/2026,07:11:28,Face,+08:00,NMR2253900026
010,Raymond Ole,08/05/2026,18:33:26,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/05/2026,17:04:13,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/05/2026,16:29:13,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/05/2026,16:04:55,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/05/2026,16:04:30,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/05/2026,13:08:35,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/05/2026,13:01:55,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/05/2026,12:48:36,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/05/2026,12:05:32,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/05/2026,12:03:39,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/05/2026,12:00:38,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/05/2026,08:53:34,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/05/2026,07:36:01,Face,+08:00,NMR2253900026
010,Raymond Ole,08/05/2026,07:05:58,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/05/2026,07:03:41,Face,+08:00,NMR2253900026
010,Raymond Ole,08/04/2026,22:01:11,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/04/2026,22:00:19,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/04/2026,19:04:06,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/04/2026,18:51:47,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/04/2026,17:48:43,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/04/2026,17:01:04,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/04/2026,16:06:57,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/04/2026,13:57:21,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/04/2026,13:20:47,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/04/2026,13:07:06,Face,+08:00,NMR2253900026
010,Raymond Ole,08/04/2026,12:59:35,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/04/2026,12:55:05,Fingerprint,+08:00,NMR2253900026
006,Joshua Fontanilla,08/04/2026,12:06:23,Face,+08:00,NMR2253900026
010,Raymond Ole,08/04/2026,12:05:59,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/04/2026,12:00:46,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/04/2026,12:00:42,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/04/2026,08:04:06,Face,+08:00,NMR2253900026
010,Raymond Ole,08/04/2026,07:34:20,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/04/2026,07:23:27,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/04/2026,07:03:34,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/04/2026,06:54:08,Face,+08:00,NMR2253900026
010,Raymond Ole,08/03/2026,18:35:55,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/03/2026,18:06:38,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/03/2026,16:58:39,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/03/2026,16:04:04,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/03/2026,16:01:39,Face,+08:00,NMR2253900026
010,Raymond Ole,08/03/2026,13:18:05,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/03/2026,13:05:17,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/03/2026,12:54:35,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/03/2026,12:50:21,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/03/2026,12:05:07,Face,+08:00,NMR2253900026
010,Raymond Ole,08/03/2026,12:04:46,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/03/2026,12:03:24,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/03/2026,12:02:52,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/03/2026,08:23:09,Face,+08:00,NMR2253900026
010,Raymond Ole,08/03/2026,07:47:10,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/03/2026,07:09:03,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/03/2026,06:43:38,Face,+08:00,NMR2253900026
010,Raymond Ole,08/01/2026,16:19:12,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/01/2026,16:09:25,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/01/2026,16:06:22,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/01/2026,16:02:41,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/01/2026,16:01:43,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/01/2026,13:24:59,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/01/2026,13:04:32,Face,+08:00,NMR2253900026
010,Raymond Ole,08/01/2026,13:01:41,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/01/2026,13:01:24,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/01/2026,12:55:18,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/01/2026,12:04:28,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/01/2026,12:03:07,Face,+08:00,NMR2253900026
010,Raymond Ole,08/01/2026,12:03:02,Face,+08:00,NMR2253900026
009,Leandro San Andres,08/01/2026,12:02:52,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/01/2026,12:01:28,Face,+08:00,NMR2253900026
006,Joshua Fontanilla,08/01/2026,07:54:39,Face,+08:00,NMR2253900026
007,Pacifico Abapo,08/01/2026,07:25:23,Face,+08:00,NMR2253900026
010,Raymond Ole,08/01/2026,07:14:13,Face,+08:00,NMR2253900026
008,Jerome Guitguit,08/01/2026,07:05:27,Face,+08:00,NMR2253900026`;

/**
 * Standardize various Date strings to YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string {
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  // Check MM/DD/YYYY or M/D/YYYY
  const mdy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const month = mdy[1].padStart(2, '0');
    const day = mdy[2].padStart(2, '0');
    const year = mdy[3];
    return `${year}-${month}-${day}`;
  }
  // Try JS Date
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return clean;
}

/**
 * Standardize Time strings to HH:mm:ss (or HH:mm), ensuring timezone offsets are not treated as time
 */
export function normalizeTime(timeStr: string): string {
  const clean = timeStr.trim();
  // If string is strictly a timezone offset like "+08:00", "-05:00", "GMT+8", "UTC", return a fallback standard time
  if (/^[+-]\d{2}(:\d{2})?$/.test(clean) || /^[+-]\d{4}$/.test(clean) || /^GMT/i.test(clean) || /^UTC/i.test(clean)) {
    return '08:00:00';
  }
  // Extract time HH:mm:ss or HH:mm from strings like "16:41:42", "16:41:42+08:00", "2026-08-21T16:41:42"
  const match = clean.match(/(?:^|T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    const ss = match[3] ? match[3] : '00';
    return `${hh}:${mm}:${ss}`;
  }
  return clean;
}

/**
 * Convert HH:mm or HH:mm:ss time string into minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // If it's timezone like "+08:00", ignore it
  if (/^[+-]\d{2}(:\d{2})?$/.test(timeStr.trim())) return 480;
  const match = timeStr.trim().match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Convert minutes from midnight to HH:mm:ss
 */
export function minutesToTime(mins: number): string {
  const normalized = Math.max(0, mins);
  const h = Math.floor(normalized / 60) % 24;
  const m = Math.floor(normalized % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}

/**
 * Check if a time string indicates a next-day punch (e.g. "02:00 (+1d)")
 */
export function checkIsNextDayString(val: string | null | undefined): boolean {
  if (!val) return false;
  return val.includes('+1d') || val.includes('+1D') || val.toLowerCase().includes('next');
}

/**
 * Unified evaluator for DTR draft anomalies.
 * Dynamically evaluates incomplete punches, sequence errors, employee matches, excessive hours,
 * and multiple punch cycles.
 */
export function evaluateDTRAnomalies(params: {
  rawPunches: string[];
  punchPairs: DTRPunchPair[];
  totalHours: number;
  hasMatchedEmployee: boolean;
  biometrixPersonId?: string;
  isEdited?: boolean;
}): DTRAnomaly[] {
  const anomalies: DTRAnomaly[] = [];
  const { rawPunches, punchPairs, totalHours, hasMatchedEmployee, biometrixPersonId, isEdited } = params;

  // Clean valid punches
  const validPunches = (rawPunches || []).filter(p => p && p.trim().length > 0);
  const oddPunches = validPunches.length % 2 !== 0;
  const hasIncompletePair = (punchPairs || []).some(p => !p.timeIn || !p.timeOut);

  // 0. Empty log check
  if (validPunches.length === 0) {
    anomalies.push({
      type: 'INCOMPLETE_PUNCH',
      severity: 'error',
      message: 'No biometric punches recorded for this day.',
    });
    return anomalies;
  }

  // 1. Incomplete attendance log check (blocking error)
  if (oddPunches || hasIncompletePair) {
    const lastPunch = validPunches.length > 0 ? validPunches[validPunches.length - 1] : 'punch';
    anomalies.push({
      type: 'INCOMPLETE_PUNCH',
      severity: 'error',
      message: `Incomplete attendance log: ${validPunches.length} punch${validPunches.length === 1 ? '' : 'es'} recorded (missing Time Out for ${lastPunch}).`,
    });
  }

  // 2. Punch sequence anomaly (error)
  for (const pair of punchPairs || []) {
    if (pair.timeIn && pair.timeOut) {
      const inM = timeToMinutes(pair.timeIn);
      const outM = timeToMinutes(pair.timeOut);
      const isNextDay = checkIsNextDayString(pair.timeOut) || checkIsNextDayString(pair.timeIn);
      if (!isNextDay && outM < inM) {
        anomalies.push({
          type: 'INVALID_SEQUENCE',
          severity: 'error',
          message: `Sequence error: Time Out (${pair.timeOut}) is earlier than Time In (${pair.timeIn}).`,
        });
        break;
      }
      if (pair.timeIn === pair.timeOut) {
        anomalies.push({
          type: 'INVALID_SEQUENCE',
          severity: 'error',
          message: `Duplicate timestamp: Time In and Time Out are identical (${pair.timeIn}).`,
        });
        break;
      }
    }
  }

  // 3. Unmatched employee (warning)
  if (!hasMatchedEmployee) {
    anomalies.push({
      type: 'UNMATCHED_EMPLOYEE',
      severity: 'warning',
      message: `Person ID "${biometrixPersonId || 'Unknown'}" is not yet linked to an active Employee profile in HRIS.`,
    });
  }

  // 4. Excessive hours (warning)
  if (totalHours > 16) {
    anomalies.push({
      type: 'EXCESSIVE_HOURS',
      severity: 'warning',
      message: `High work duration: ${totalHours.toFixed(1)} hrs logged. Please verify shift validity.`,
    });
  }

  // 5. Multiple punch cycles (warning)
  if (!isEdited && validPunches.length > 4) {
    anomalies.push({
      type: 'MULTIPLE_PUNCHES',
      severity: 'warning',
      message: `Multiple punch cycles: ${validPunches.length} distinct punches recorded throughout the day.`,
    });
  } else if (isEdited && validPunches.length > 8) {
    anomalies.push({
      type: 'MULTIPLE_PUNCHES',
      severity: 'warning',
      message: `High punch count: ${validPunches.length} distinct punches recorded throughout the day.`,
    });
  }

  return anomalies;
}

/**
 * Calculates work duration, overtime, and undertime based on punch pairs
 * Overtime Rule:
 * "the overtime should be counted by hours after 8hours of work, and rounded down by 30mins
 * (for example. the overtime is 1hr 45 mins, it will be counted as 1.5hrs only)"
 */
export function calculatePunchMetrics(pairs: DTRPunchPair[]): {
  totalMinutes: number;
  totalHours: number;
  daysWorked: number;
  overtimeHours: number;
  undertimeMinutes: number;
  undertimeHours: number;
} {
  let totalMinutes = 0;

  pairs.forEach(pair => {
    if (pair.timeIn && pair.timeOut) {
      const inM = timeToMinutes(pair.timeIn);
      const outM = timeToMinutes(pair.timeOut);
      let diff = outM - inM;
      if (diff < 0) {
        // Crosses midnight
        diff += 24 * 60;
      }
      totalMinutes += diff;
    }
  });

  // Total Hours displayed rounded to 1 decimal
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Overtime Calculation: Hours after 8 hours (480 mins) of work, rounded down by 30 mins (0.5 hrs step)
  let overtimeHours = 0;
  if (totalMinutes > 480) {
    const extraMinutes = totalMinutes - 480;
    // Step is 30 mins = 0.5 hours. Round down:
    overtimeHours = Math.floor(extraMinutes / 30) * 0.5;
  }

  // Undertime Calculation:
  // If attendance is less than 4hrs, consider it as half day (0.5 days work), and make undertime count from 4hrs (240 mins)
  let undertimeMinutes = 0;
  let undertimeHours = 0;
  if (totalMinutes > 0) {
    if (totalMinutes < 240) {
      undertimeMinutes = 240 - totalMinutes;
      undertimeHours = Math.round((undertimeMinutes / 60) * 100) / 100;
    } else if (totalMinutes < 480) {
      undertimeMinutes = 480 - totalMinutes;
      undertimeHours = Math.round((undertimeMinutes / 60) * 100) / 100;
    }
  }

  const daysWorked = totalMinutes >= 240 ? 1 : totalMinutes > 0 ? 0.5 : 0;

  return {
    totalMinutes,
    totalHours,
    daysWorked,
    overtimeHours,
    undertimeMinutes,
    undertimeHours,
  };
}

export interface RawBiometricRow {
  personId: string;
  personName: string;
  date: string;
  time: string;
  verifyType?: string;
  source?: string;
}

/**
 * Parses raw biometrics log text (CSV / TSV / custom)
 */
export function parseRawBiometricsText(csvText: string): RawBiometricRow[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0].toLowerCase();
  const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';

  // Identify column indices
  let personIdIdx = 0;
  let personNameIdx = 1;
  let dateIdx = 2;
  let timeIdx = 3;
  let verifyTypeIdx = 4;
  let sourceIdx = 6;

  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const isHeader = headers.some(h => h.includes('person') || h.includes('id') || h.includes('date') || h.includes('time') || h.includes('record') || h.includes('attendance'));

  if (isHeader) {
    headers.forEach((h, idx) => {
      // 1. Timezone column MUST be identified first and NOT treated as punch time or attendance record
      if (h.includes('zone') || h.includes('tz') || h === 'timezone' || h === 'time zone') {
        // Skip timezone column! Do NOT treat timezone as time!
        return;
      }
      if (h.includes('person id') || h === 'id' || h.includes('biometric id') || h.includes('pin') || h.includes('emp id') || h === 'bio id') {
        personIdIdx = idx;
      } else if (h.includes('person name') || h.includes('name') || h.includes('employee name')) {
        personNameIdx = idx;
      } else if (h.includes('date') || h.includes('punch date')) {
        dateIdx = idx;
      } else if (
        h.includes('attendance record') ||
        h === 'attendance' ||
        h === 'record' ||
        h === 'punch time' ||
        h === 'punch' ||
        h === 'time' ||
        h.includes('time in') ||
        h.includes('time out') ||
        (h.includes('time') && !h.includes('zone') && !h.includes('tz'))
      ) {
        timeIdx = idx;
      } else if (h.includes('verify') || h.includes('type')) {
        verifyTypeIdx = idx;
      } else if (h.includes('source') || h.includes('device')) {
        sourceIdx = idx;
      }
    });
  }

  const rows: RawBiometricRow[] = [];
  const startRow = isHeader ? 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = rawLine.split(delimiter).map(c => c.trim().replace(/^['"]|['"]$/g, ''));
    if (cols.length < 3) continue;

    const personId = cols[personIdIdx] || `P-${i}`;
    const personName = cols[personNameIdx] || `Person ${personId}`;
    const rawDate = cols[dateIdx] || '';
    
    // Safety check: Ensure rawTime is the actual time, not a timezone like "+08:00"
    let rawTime = cols[timeIdx] || '';
    if (/^[+-]\d{2}(:\d{2})?$/.test(rawTime.trim()) || /^[+-]\d{4}$/.test(rawTime.trim())) {
      // If the selected column is timezone, scan other columns for a valid HH:mm:ss time
      const actualTimeCol = cols.find(c => /^\d{1,2}:\d{2}(:\d{2})?$/.test(c.trim()));
      if (actualTimeCol) {
        rawTime = actualTimeCol;
      }
    }

    const verifyType = cols[verifyTypeIdx] || 'Biometric';
    const source = cols[sourceIdx] || 'NMR Device';

    if (!rawDate || !rawTime) continue;

    const normalizedDate = normalizeDate(rawDate);
    const normalizedTime = normalizeTime(rawTime);

    rows.push({
      personId,
      personName,
      date: normalizedDate,
      time: normalizedTime,
      verifyType,
      source,
    });
  }

  return rows;
}

/**
 * Organizes raw biometric punch rows into Draft DTR Records with anomaly detection
 */
export function buildDraftDTRRecords(
  rawRows: RawBiometricRow[],
  employees: Employee[]
): DTRDraftRecord[] {
  // Group rows by personId + date
  const grouped = new Map<string, RawBiometricRow[]>();

  rawRows.forEach(row => {
    const key = `${row.personId}__${row.date}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  const drafts: DTRDraftRecord[] = [];

  grouped.forEach((rows, key) => {
    const [personId, date] = key.split('__');
    const personName = rows[0].personName;

    // Find matching employee: person ID in upload must match biometrixId in employees
    const matchedEmployee = employees.find(e => {
      if (!e.biometrixId) return false;
      const cleanBio = e.biometrixId.trim().toLowerCase();
      const cleanPid = personId.trim().toLowerCase();
      
      // Direct exact match
      if (cleanBio === cleanPid) return true;

      // Numeric normalized match (strip non-digits or leading zeros, e.g. "008" == "008" or "8" or "BIO-008")
      const numBio = e.biometrixId.replace(/^[A-Za-z\-_]+/, '').replace(/^0+/, '');
      const numPerson = personId.replace(/^[A-Za-z\-_]+/, '').replace(/^0+/, '');
      if (numBio && numPerson && numBio === numPerson) return true;

      return false;
    }) || employees.find(e => {
      // Secondary fallback by employeeNumber
      if (e.employeeNumber && e.employeeNumber.trim().toLowerCase() === personId.trim().toLowerCase()) return true;
      return false;
    }) || employees.find(e => {
      // Final fallback by name
      const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
      const pName = personName.toLowerCase();
      return fullName.includes(pName) || pName.includes(e.lastName.toLowerCase());
    });

    // Sort punches chronologically
    const sortedPunches = [...rows].sort((a, b) => {
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });

    // Filter out rapid duplicates (< 2 minutes apart) while logging an anomaly
    const anomalies: DTRAnomaly[] = [];
    const dedupedPunches: string[] = [];

    sortedPunches.forEach((punch, idx) => {
      if (idx === 0) {
        dedupedPunches.push(punch.time);
      } else {
        const prevMins = timeToMinutes(sortedPunches[idx - 1].time);
        const currMins = timeToMinutes(punch.time);
        if (currMins - prevMins <= 2) {
          anomalies.push({
            type: 'RAPID_PUNCH',
            severity: 'info',
            message: `Filtered rapid duplicate scan at ${punch.time} (within 2 mins of ${sortedPunches[idx - 1].time}).`,
            punchIndex: idx,
          });
        } else {
          dedupedPunches.push(punch.time);
        }
      }
    });

    // Pair punches into (TimeIn, TimeOut) intervals
    const punchPairs: DTRPunchPair[] = [];
    for (let i = 0; i < dedupedPunches.length; i += 2) {
      const timeIn = dedupedPunches[i];
      const timeOut = i + 1 < dedupedPunches.length ? dedupedPunches[i + 1] : null;

      let durationMinutes = 0;
      let durationHours = 0;
      if (timeIn && timeOut) {
        let diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
        if (diff < 0) diff += 24 * 60;
        durationMinutes = diff;
        durationHours = Math.round((diff / 60) * 10) / 10;
      }

      punchPairs.push({
        timeIn,
        timeOut,
        durationMinutes,
        durationHours,
      });
    }

    // Calculate metrics
    const metrics = calculatePunchMetrics(punchPairs);

    // Evaluate anomalies using the unified helper
    const evaluatedAnomalies = evaluateDTRAnomalies({
      rawPunches: dedupedPunches,
      punchPairs,
      totalHours: metrics.totalHours,
      hasMatchedEmployee: Boolean(matchedEmployee),
      biometrixPersonId: personId,
      isEdited: false,
    });

    const allAnomalies = [...anomalies, ...evaluatedAnomalies];

    // Day of week name
    const d = new Date(date + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = isNaN(d.getTime()) ? 'Unknown' : dayNames[d.getDay()];

    const draftId = `draft-${personId}-${date}-${Date.now().toString(36)}`;

    // Compute late minutes from 08:00 AM standard
    const firstPunch = punchPairs[0]?.timeIn || dedupedPunches[0] || null;
    let lateMinutes = 0;
    if (firstPunch) {
      const inMins = timeToMinutes(firstPunch);
      if (inMins > 485) { // 08:00 AM + 5 min grace
        lateMinutes = inMins - 480;
      }
    }

    drafts.push({
      id: draftId,
      biometrixPersonId: personId,
      biometrixId: matchedEmployee?.biometrixId || personId,
      employeeId: matchedEmployee?.id,
      employeeNumber: matchedEmployee?.employeeNumber,
      employeeName: matchedEmployee ? `${matchedEmployee.firstName} ${matchedEmployee.lastName}` : personName,
      date,
      dayOfWeek,
      rawPunches: dedupedPunches,
      punchPairs,
      totalHours: metrics.totalHours,
      totalMinutes: metrics.totalMinutes,
      overtimeHours: metrics.overtimeHours,
      lateMinutes,
      undertimeMinutes: metrics.undertimeMinutes,
      undertimeHours: metrics.undertimeHours,
      anomalies: allAnomalies,
      status: allAnomalies.some(a => a.severity === 'error') ? 'PENDING' : 'VALIDATED',
    });
  });

  // Sort by date ascending, then employee name
  return drafts.sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName));
}

/**
 * Direct generation of finalized DTR Records from the Biometrics CSV
 */
export function generateDTRRecordsFromBiometricCSV(
  csvText: string,
  employees: Employee[]
): DTRRecord[] {
  const rawRows = parseRawBiometricsText(csvText);
  const drafts = buildDraftDTRRecords(rawRows, employees);

  return drafts.map(draft => {
    const emp = employees.find(e => 
      (e.biometrixId && (e.biometrixId.trim().toLowerCase() === draft.biometrixPersonId.trim().toLowerCase() ||
        e.biometrixId.replace(/^0+/, '') === draft.biometrixPersonId.replace(/^0+/, ''))) ||
      e.id === draft.employeeId ||
      e.employeeNumber === draft.employeeNumber
    );

    const firstIn = draft.punchPairs[0]?.timeIn || draft.rawPunches[0] || null;
    const lastPair = draft.punchPairs[draft.punchPairs.length - 1];
    const lastOut = lastPair?.timeOut || (draft.rawPunches.length > 1 ? draft.rawPunches[draft.rawPunches.length - 1] : null);

    const d = new Date(draft.date + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = isNaN(d.getTime()) ? draft.dayOfWeek : dayNames[d.getDay()];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const dayType: DayType = isWeekend ? 'Rest Day' : 'Regular Working Day';

    // Calculate tardiness from draft or arrival
    let lateMinutes = draft.lateMinutes !== undefined ? draft.lateMinutes : 0;
    if (lateMinutes === 0 && firstIn) {
      const inMins = timeToMinutes(firstIn);
      if (inMins > 485) {
        lateMinutes = inMins - 480;
      }
    }

    let calcTotalHours = draft.totalHours;
    if (calcTotalHours === 0 && (firstIn || draft.rawPunches.length > 0)) {
      calcTotalHours = 8.0;
    }

    let status: DTRRecord['status'] = 'Present';
    if (draft.rawPunches.length === 0 && !firstIn) {
      status = isWeekend ? 'Rest Day' : 'Present';
    } else if (calcTotalHours > 0 && calcTotalHours < 4) {
      status = 'Half Day';
    } else if (lateMinutes > 0) {
      status = 'Late';
    } else {
      status = 'Present';
    }

    return {
      id: `DTR-${emp?.id || draft.biometrixPersonId}-${draft.date}`,
      employeeId: emp?.id || `emp-${draft.biometrixPersonId}`,
      employeeNumber: emp?.employeeNumber || `EMP-${draft.biometrixPersonId}`,
      biometrixId: draft.biometrixPersonId, // Person ID strictly used as Biometrix ID
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : draft.employeeName,
      date: draft.date,
      dayOfWeek,
      dayType,
      timeIn: firstIn,
      timeOut: lastOut || (draft.rawPunches.length === 1 ? '17:00:00' : null),
      punchPairs: draft.punchPairs.length > 0 ? draft.punchPairs : (firstIn ? [{
        timeIn: firstIn,
        timeOut: lastOut || '17:00:00',
        durationMinutes: 480,
        durationHours: 8.0,
      }] : []),
      rawPunches: draft.rawPunches.length > 0 ? draft.rawPunches : (firstIn ? [firstIn] : []),
      regularHours: Math.min(8, calcTotalHours),
      totalHours: calcTotalHours,
      lateMinutes,
      undertimeMinutes: draft.undertimeMinutes,
      undertimeHours: draft.undertimeHours,
      overtimeHours: draft.overtimeHours,
      nightDiffHours: 0,
      status,
      source: 'Biometrics' as const,
      remarks: draft.anomalies.length > 0 
        ? `Biometrics Log (${draft.rawPunches.join(', ')})`
        : `Verified Biometrics Log (Device: NMR2253900026)`,
    };
  }).sort((a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName));
}


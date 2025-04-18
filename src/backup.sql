-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: linkarts
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `artists`
--

DROP TABLE IF EXISTS `artists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `artists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `cellphone` varchar(255) DEFAULT NULL,
  `cpf` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `artists`
--

LOCK TABLES `artists` WRITE;
/*!40000 ALTER TABLE `artists` DISABLE KEYS */;
INSERT INTO `artists` VALUES (1,'Kevin Cair├® Leandro','kevincaireleandro@hotmail.com','$2b$10$ak2QdIlUqkA04zbnaYLV8OzgX9R38aPeSYHjPkJzO6oNz/iUB0com','1223','12312312322','2025-04-01 04:18:41','2025-04-01 04:18:41'),(2,'Kevin Cair├® Leandro 2','kevin.leandro@fatec.sp.gov.br','$2b$10$QzGEv07tyCg4.YM.JljtY.3Vp7dZLRgHgtE6BLOSbtavOJJ4GAzTu','15991382002','12345678912','2025-04-01 04:19:29','2025-04-01 04:19:29'),(3,'Kevin','gggg@g.com','$2b$10$jtg5.Idk/IxTaY0bJ0nK.O2H4hJduRo6y.JnT7qAziZ1KjuzrlUiK','123123','123','2025-04-02 03:37:31','2025-04-02 03:37:31'),(4,'123','123@hotmail.com','$2b$10$CIfJ7H//TQUzo/a3onZVXuQF.5Sk4kaiL2uVfPFE1P.1NM1eCjhJe','(12) 31231-2312','452.632.198-22','2025-04-08 02:21:07','2025-04-08 02:21:07'),(5,'Kevin Cair├® Leandro','333@222','$2b$10$J0OP9AY6v.Q.7nB7IAMQD.evikjTUByhKw0WN6egipTizIFEcNI3m','(11) 12333-3333','452.632.198-22','2025-04-15 14:54:35','2025-04-15 14:54:35');
/*!40000 ALTER TABLE `artists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `establishments`
--

DROP TABLE IF EXISTS `establishments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `establishments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `cellphone` varchar(255) DEFAULT NULL,
  `cnpj` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `establishments`
--

LOCK TABLES `establishments` WRITE;
/*!40000 ALTER TABLE `establishments` DISABLE KEYS */;
INSERT INTO `establishments` VALUES (1,'Bar Legal','teste@hotmail.com','$2b$10$f270JpAR0BNeiukl695o7utJYH096aWxrp71iVocUOxN5wwzyCKGe','15991382002','123123123','2025-04-02 03:06:08','2025-04-02 03:06:08'),(2,'Novo Estabelecimento','novoestabelecimento@hotmail.com','$2b$10$6j2GkCtKdqAT.dSucH3yieILMEYS2b/5PSIDwfjT8Ao1.mvdMs6ou','(12) 12121-2122','19.887.849/0001-57','2025-04-09 03:51:07','2025-04-09 03:51:07'),(3,'Novo Estabelecimento 2','aaaa@aaaa','$2b$10$isjdwi/9YzkJMyem/8y2NePf7ZW/R2pfPx917DLp2kNagC2P0gkQe','(13) 33142-4222','19.887.849/0001-57','2025-04-09 03:54:12','2025-04-09 03:54:12'),(4,'Novo Estabelecimento 2','novo@hotmail.com','$2b$10$leNAy/YQ2Rt4N0OOa4vPCuKs5oDyPJJeJ0QMYmelXwB46jIMvXi2m','(19) 91991-9919','19.887.849/0001-57','2025-04-09 03:57:23','2025-04-09 03:57:23');
/*!40000 ALTER TABLE `establishments` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-04-15 12:36:17

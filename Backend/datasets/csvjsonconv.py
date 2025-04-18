import csv
import json
import argparse

# Convierte un archivo CSV a un archivo JSON.
def convertir_csv_a_json(ruta_csv, ruta_json):
    """
    Lee datos de un archivo CSV y los escribe en un archivo JSON.

    Cada fila del CSV (excluyendo la cabecera) se convierte en un objeto
    JSON dentro de una lista JSON principal. La primera fila del CSV
    se utiliza como las claves para los objetos JSON.

    Args:
        ruta_csv (str): La ruta al archivo CSV de entrada.
        ruta_json (str): La ruta donde se guardará el archivo JSON de salida.
    """
    lista_datos = []

    try:
        # Abre el archivo CSV para lectura
        # encoding='utf-8' es importante para compatibilidad de caracteres
        # newline='' evita problemas con filas en blanco en algunos sistemas
        with open(ruta_csv, mode='r', encoding='utf-8', newline='') as archivo_csv:
            # csv.DictReader trata la primera fila como cabecera (claves)
            # y cada fila subsiguiente como un diccionario
            lector_csv = csv.DictReader(archivo_csv)

            # Itera sobre cada fila (diccionario) en el lector CSV
            for fila in lector_csv:
                lista_datos.append(fila)

        # Abre el archivo JSON para escritura
        with open(ruta_json, mode='w', encoding='utf-8') as archivo_json:
            # Escribe la lista de diccionarios al archivo JSON
            # json.dump serializa el objeto Python (lista_datos) a formato JSON
            # indent=4 formatea el JSON para que sea legible por humanos
            json.dump(lista_datos, archivo_json, indent=4, ensure_ascii=False)

        print(f"¡Éxito! Archivo '{ruta_csv}' convertido a '{ruta_json}'")

    except FileNotFoundError:
        print(f"Error: El archivo CSV '{ruta_csv}' no fue encontrado.")
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")

# --- Bloque Principal ---
# Este código solo se ejecuta si el script es llamado directamente
if __name__ == "__main__":
    # Configura el analizador de argumentos de línea de comandos
    parser = argparse.ArgumentParser(description='Convierte un archivo CSV a JSON.')

    # Define los argumentos esperados: ruta_csv y ruta_json
    parser.add_argument('ruta_csv', help='Ruta del archivo CSV de entrada.')
    parser.add_argument('ruta_json', help='Ruta del archivo JSON de salida.')

    # Analiza los argumentos proporcionados por el usuario
    args = parser.parse_args()

    # Llama a la función de conversión con las rutas proporcionadas
    convertir_csv_a_json(args.ruta_csv, args.ruta_json)

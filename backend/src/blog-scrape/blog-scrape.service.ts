import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface ScrapedSong {
  title: string;
  titleKo?: string;
  tj?: string;
  ky?: string;
  joysound?: string;
}

@Injectable()
export class BlogScrapeService {
  async scrapeSongs(url: string): Promise<ScrapedSong[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new HttpException(
          `Failed to fetch URL: ${response.statusText}`,
          response.status
        );
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const songs: ScrapedSong[] = [];

      // Find all tables with the specific style
      $('table[style*="border-collapse: collapse"]').each((_, table) => {
        const $table = $(table);

        // Skip the header row and process data rows
        $table.find('tbody tr').each((_, row) => {
          const $row = $(row);

          // Skip header row (first row with "곡명", "TJ", "KY", "JOYSOUND")
          const firstCell = $row.find('td').first().text().trim();
          if (firstCell === '곡명') {
            return; // continue to next iteration
          }

          // Skip rows with ads or colspan
          if ($row.find('td[colspan]').length > 0) {
            return; // continue to next iteration
          }

          const cells = $row.find('td');
          if (cells.length < 4) {
            return; // continue to next iteration
          }

          // Extract song data
          const titleCell = $(cells[0]);
          const tjCell = $(cells[1]);
          const kyCell = $(cells[2]);
          const joysoundCell = $(cells[3]);

          // Extract title and Korean title
          const titleLink = titleCell.find('a');
          const titleSpans = titleCell.find('span');

          let title = '';
          let titleKo = '';

          if (titleLink.length > 0) {
            // Has a link
            title = titleLink.text().trim();
          } else {
            // No link, get first span
            title = titleSpans.first().text().trim();
          }

          // Get Korean title (usually the second line)
          const brElements = titleCell.find('br');
          if (brElements.length > 0) {
            // Get text after <br>
            const htmlContent = titleCell.html() || '';
            const parts = htmlContent.split('<br>');
            if (parts.length > 1) {
              const $secondPart = cheerio.load(parts[1]);
              titleKo = $secondPart('span').text().trim();
            }
          }

          // Extract karaoke numbers
          const tj = tjCell.text().trim();
          const ky = kyCell.text().trim();
          const joysound = joysoundCell.text().trim();

          // Create song object
          const song: ScrapedSong = {
            title,
            ...(titleKo && { titleKo }),
            ...(tj && tj !== '-' && { tj }),
            ...(ky && ky !== '-' && { ky }),
            ...(joysound && joysound !== '-' && { joysound }),
          };

          // Only add if we have a valid title
          if (title) {
            songs.push(song);
          }
        });
      });

      return songs;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to scrape data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

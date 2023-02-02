class Paginator {

  /**
   * @param {number} linksSize - the number of links which will be shown
   * @param {string[]} currentPageClasses - the CSS classes which marks the active page, usually it's <li class="active">
   */
  constructor(linksSize, currentPageClasses) {
    this.linksSize = +linksSize || 5;
    this.currentPageClasses = currentPageClasses || ['active'];
  }


  /**
   * Calculate the page links and make current page active.
   * @param {number} currentPage - current page
   * @param {number} itemsTotal - the total number of items
   * @param {number} itemsPerPage - number of items on one page
   * @returns {{ pageLinks:{i:number, c:string[]}[], pagesTotal:number }}
   */
  async page(currentPage, itemsTotal, itemsPerPage) {
    currentPage = +currentPage; // convert to number
    const pagesTotal = Math.ceil(itemsTotal / itemsPerPage); // define total number of pages

    // define pagination numbers that will be shown from start to end
    const half = Math.ceil(this.linksSize / 2);
    let istart;
    let iend;
    if (pagesTotal >= this.linksSize) {
      if (currentPage >= 1 && currentPage < this.linksSize) {
        istart = 1;
        iend = this.linksSize;
      } else if (currentPage >= this.linksSize && currentPage <= pagesTotal - half) {
        istart = currentPage - half;
        iend = currentPage + half;
      } else {
        istart = pagesTotal - this.linksSize + 1;
        iend = pagesTotal;
      }
    } else {
      istart = 1;
      iend = pagesTotal;
    }

    // define pagelinks objects
    let i; // link number
    const pageLinks = [];
    for (i = istart; i <= iend; i++) {
      const c = i === currentPage ? this.currentPageClasses : []; // current (active) page CSS classes
      const obj = { i, c };
      pageLinks.push(obj);
    }

    return { pageLinks, pagesTotal };
  }


  /**
   * Calculate the skip number, i.e. how many items to skip.
   * @param {number} currentPage - current page number
   * @param {number} itemsPerPage - total items per one page
   * @returns {number}
   */
  skipCalc(currentPage, itemsPerPage) {
    const skip = (currentPage - 1) * itemsPerPage;
    return skip;
  }


  /**
   * Calculate the table ordinal number #.
   * @param {number} currentPage - current page number
   * @param {number} itemsPerPage - total items per one page
   * @param {number} i - table row number: 0, 1, 2, ...
   * @returns {number}
   */
  ordCalc(currentPage, itemsPerPage, i) {
    const ord = (currentPage - 1) * itemsPerPage + i + 1;
    return ord;
  }




}

export default Paginator;
